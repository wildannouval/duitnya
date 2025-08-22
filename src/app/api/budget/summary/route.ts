import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function parseMonth(url: string) {
  const u = new URL(url);
  const q = u.searchParams.get("month");
  let ym: string;
  if (q && /^\d{4}-\d{2}$/.test(q)) ym = q;
  else {
    const now = new Date();
    ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }
  const [y, m] = ym.split("-").map(Number);
  // rentang UTC aman
  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, 1, 0, 0, 0));
  return { ym, start, end };
}

// GET /api/budget/summary?month=YYYY-MM
export async function GET(req: Request) {
  const { ym, start, end } = parseMonth(req.url);

  // Budget & items untuk bulan tsb
  const budget = await prisma.budget.findUnique({
    where: { month: ym },
    include: {
      items: { include: { category: true } },
    },
  });

  const items = budget?.items ?? [];

  if (items.length === 0) {
    return NextResponse.json({
      month: ym,
      items: [],
      totals: { planned: 0, spent: 0, remaining: 0 },
    });
  }

  // Total pengeluaran per kategori bulan ini (amount EXPENSE tersimpan negatif)
  const spentByCat = await prisma.transaction.groupBy({
    by: ["categoryId"],
    _sum: { amount: true },
    where: {
      type: "EXPENSE",
      date: { gte: start, lt: end },
      categoryId: { in: items.map((i) => i.categoryId) },
    },
  });

  // peta categoryId -> spent(positif)
  const spentMap = new Map<string, number>();
  for (const row of spentByCat) {
    const neg = row._sum.amount ?? 0;
    spentMap.set(row.categoryId!, Math.abs(neg));
  }

  const mapped = items.map((i) => {
    const planned = i.amountPlanned;
    const spent = spentMap.get(i.categoryId) ?? 0;
    const remaining = Math.max(planned - spent, 0);
    const percent = planned > 0 ? Math.min(Math.round((spent / planned) * 100), 100) : 0;
    return {
      id: i.id,
      categoryId: i.categoryId,
      categoryName: i.category.name,
      planned,
      spent,
      remaining,
      percent,
    };
  });

  const totals = mapped.reduce(
    (acc, it) => {
      acc.planned += it.planned;
      acc.spent += it.spent;
      return acc;
    },
    { planned: 0, spent: 0 }
  );
  const remaining = Math.max(totals.planned - totals.spent, 0);

  return NextResponse.json({
    month: ym,
    items: mapped.sort((a, b) => a.categoryName.localeCompare(b.categoryName)),
    totals: { planned: totals.planned, spent: totals.spent, remaining },
  });
}
