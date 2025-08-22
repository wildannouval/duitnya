import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function getYM(u: URL) {
  const m = u.searchParams.get("month");
  if (m && /^\d{4}-\d{2}$/.test(m)) return m;
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
}

function monthRange(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, 1, 0, 0, 0));
  return { start, end };
}

// GET /api/budgets?month=YYYY-MM
// return: budgets + spent (pengeluaran bulan tsb per kategori)
export async function GET(req: Request) {
  const url = new URL(req.url);
  const ym = getYM(url);
  const budgets = await prisma.budget.findMany({
    where: { month: ym },
    include: { category: true },
    orderBy: [{ amount: "desc" }],
  });

  const catIds = budgets.map((b) => b.categoryId);
  let spentMap = new Map<string, number>();
  if (catIds.length > 0) {
    const { start, end } = monthRange(ym);
    const agg = await prisma.transaction.groupBy({
      by: ["categoryId"],
      where: {
        type: "EXPENSE",
        categoryId: { in: catIds },
        date: { gte: start, lt: end },
      },
      _sum: { amount: true },
    });
    // amount EXPENSE disimpan negatif -> spent = -sum
    spentMap = new Map(
      agg.map((a) => [a.categoryId!, Math.abs(a._sum.amount ?? 0)])
    );
  }

  const result = budgets.map((b) => ({
    ...b,
    spent: spentMap.get(b.categoryId) ?? 0,
  }));

  return NextResponse.json({ month: ym, items: result });
}

// POST /api/budgets
// body: { month:"YYYY-MM", categoryId, amount(>0) }
// upsert jika (month,categoryId) sudah ada
export async function POST(req: Request) {
  try {
    const b = await req.json();
    const month = String(b?.month ?? "");
    const categoryId = String(b?.categoryId ?? "");
    const amount = Math.round(Number(b?.amount ?? 0));
    if (!/^\d{4}-\d{2}$/.test(month)) return NextResponse.json({ error: "month harus YYYY-MM" }, { status: 400 });
    if (!categoryId) return NextResponse.json({ error: "categoryId wajib" }, { status: 400 });
    if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "amount harus > 0" }, { status: 400 });

    const cat = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!cat) return NextResponse.json({ error: "Kategori tidak ditemukan" }, { status: 404 });
    if (cat.type !== "EXPENSE") return NextResponse.json({ error: "Budget hanya untuk kategori EXPENSE" }, { status: 400 });

    const saved = await prisma.budget.upsert({
      where: { month_categoryId: { month, categoryId } },
      update: { amount },
      create: { month, categoryId, amount },
      include: { category: true },
    });

    return NextResponse.json(saved, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
