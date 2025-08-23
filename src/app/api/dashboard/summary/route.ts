import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function parseMonth(m?: string) {
  const now = new Date();
  if (m && /^\d{4}-\d{2}$/.test(m)) {
    const [y, mm] = m.split("-").map(Number);
    const start = new Date(Date.UTC(y, mm - 1, 1, 0, 0, 0));
    const end = new Date(Date.UTC(y, mm, 1, 0, 0, 0)); // next month
    return { start, end, month: m };
  }
  const cur = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const start = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1, 0, 0, 0));
  const end = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0));
  return { start, end, month: cur };
}

function ymd(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate()
  ).padStart(2, "0")}`;
}

// GET /api/dashboard/summary?month=YYYY-MM&accountId=...&categoryId=...
export async function GET(req: Request) {
  const url = new URL(req.url);
  const monthQ = url.searchParams.get("month") || undefined;
  const accountId = url.searchParams.get("accountId") || undefined;
  const categoryId = url.searchParams.get("categoryId") || undefined;

  const { start, end, month } = parseMonth(monthQ);

  // Hanya transaksi INCOME/EXPENSE (TRANSFER dikeluarkan dari ringkasan)
  const where: any = {
    date: { gte: start, lt: end },
    NOT: { type: "TRANSFER" },
  };
  if (accountId && accountId !== "__ALL__") where.accountId = accountId;
  if (categoryId && categoryId !== "__ALL__") where.categoryId = categoryId;

  const txs = await prisma.transaction.findMany({
    where,
    orderBy: { date: "asc" },
    include: { category: true },
  });

  let income = 0;
  let expense = 0; // positif (absolut)
  const perDay = new Map<string, { income: number; expense: number }>();
  const perCat = new Map<string, { categoryId: string | null; name: string; expense: number }>();

  // siapkan skeleton tanggal harian agar chart tak bolong
  const cur = new Date(start);
  while (cur < end) {
    perDay.set(ymd(cur), { income: 0, expense: 0 });
    cur.setUTCDate(cur.getUTCDate() + 1);
  }

  for (const t of txs) {
    const d = ymd(new Date(t.date));
    if (!perDay.has(d)) perDay.set(d, { income: 0, expense: 0 });

    if (t.type === "INCOME") {
      const val = Math.abs(t.amount);
      income += val;
      perDay.get(d)!.income += val;
    } else if (t.type === "EXPENSE") {
      const val = Math.abs(t.amount);
      expense += val;
      perDay.get(d)!.expense += val;

      // breakdown kategori (khusus expense)
      const key = t.categoryId ?? "__UNCAT__";
      const name = t.category?.name ?? "Uncategorized";
      if (!perCat.has(key)) perCat.set(key, { categoryId: t.categoryId, name, expense: 0 });
      perCat.get(key)!.expense += val;
    }
  }

  const daily = Array.from(perDay.entries()).map(([date, v]) => ({
    date,
    income: v.income,
    expense: v.expense,
    net: v.income - v.expense,
  }));

  // sort tanggal asc
  daily.sort((a, b) => (a.date < b.date ? -1 : 1));

  const categories = Array.from(perCat.values()).sort((a, b) => b.expense - a.expense);

  return NextResponse.json({
    month,
    totalIncome: income,
    totalExpense: expense,
    net: income - expense,
    daily,
    categories,
  });
}
