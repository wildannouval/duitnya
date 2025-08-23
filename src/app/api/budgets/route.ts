import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function ymRange(ym?: string) {
  if (!ym || !/^\d{4}-\d{2}$/.test(ym)) {
    const now = new Date();
    ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }
  const [y, m] = ym.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, 1, 0, 0, 0));
  return { ym, start, end };
}

// GET /api/budgets?month=YYYY-MM
// return: { month, items: [{ id, month, categoryId, amount, spent, createdAt, category:{id,name}}] }
export async function GET(req: Request) {
  const u = new URL(req.url);
  const { ym, start, end } = ymRange(u.searchParams.get("month") || undefined);

  const rows = await prisma.budget.findMany({
    where: { month: ym },
    include: { category: true },
    orderBy: [{ createdAt: "desc" }],
  });

  // Aggregate pengeluaran (EXPENSE) per kategori di bulan tsb
  const grouped = await prisma.transaction.groupBy({
    by: ["categoryId"],
    where: {
      type: "EXPENSE",
      date: { gte: start, lt: end },
      categoryId: { not: null },
    },
    _sum: { amount: true },
  });
  const spentMap = new Map<string, number>(
    grouped.map((g) => [g.categoryId as string, Math.abs(g._sum.amount ?? 0)])
  );

  const items = rows.map((b) => ({
    ...b,
    spent: spentMap.get(b.categoryId) ?? 0,
  }));

  return NextResponse.json({ month: ym, items });
}

// POST /api/budgets  { month, categoryId, amount }
export async function POST(req: Request) {
  try {
    const b = await req.json();
    const month: string = String(b?.month ?? "");
    const categoryId: string = String(b?.categoryId ?? "");
    const amount: number = Math.round(Number(b?.amount ?? 0));

    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: "Format month harus YYYY-MM" }, { status: 400 });
    }
    if (!categoryId) return NextResponse.json({ error: "categoryId wajib" }, { status: 400 });
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "amount harus > 0" }, { status: 400 });
    }

    const cat = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!cat) return NextResponse.json({ error: "Kategori tidak ditemukan." }, { status: 404 });
    if (cat.type !== "EXPENSE" || !cat.isBudgetable) {
      return NextResponse.json({ error: "Budget hanya untuk kategori EXPENSE & budgetable." }, { status: 400 });
    }

    const saved = await prisma.budget.upsert({
      where: { month_categoryId: { month, categoryId } },
      update: { amount },
      create: { month, categoryId, amount },
      include: { category: true },
    });

    return NextResponse.json({ ...saved, spent: 0 }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
