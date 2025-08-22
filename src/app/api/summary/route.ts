import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function startEndOfThisMonth() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0));
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return { start, end, ym };
}

export async function GET() {
  const { start, end, ym } = startEndOfThisMonth();

  // Accounts with balance
  const accounts = await prisma.account.findMany({ orderBy: { createdAt: "desc" } });
  const withBalance = await Promise.all(
    accounts.map(async (acc) => {
      const agg = await prisma.transaction.aggregate({
        _sum: { amount: true },
        where: {
          OR: [
            { accountId: acc.id },
            { fromAccountId: acc.id },
            { toAccountId: acc.id },
          ],
        },
      });
      const delta = agg._sum.amount ?? 0;
      return { id: acc.id, name: acc.name, type: acc.type, initialBalance: acc.initialBalance, balance: acc.initialBalance + delta };
    })
  );

  // Income month
  const incAgg = await prisma.transaction.aggregate({
    _sum: { amount: true },
    where: { type: "INCOME", date: { gte: start, lt: end } },
  });
  const incomeMonth = incAgg._sum.amount ?? 0;

  // Expense month (amount disimpan negatif → pakai nilai absolut)
  const expAgg = await prisma.transaction.aggregate({
    _sum: { amount: true },
    where: { type: "EXPENSE", date: { gte: start, lt: end } },
  });
  const expenseMonth = Math.abs(expAgg._sum.amount ?? 0);

  const netMonth = incomeMonth - expenseMonth;
  const totalBalance = withBalance.reduce((s, a) => s + a.balance, 0);

  return NextResponse.json({
    period: ym,
    totals: { totalBalance, incomeMonth, expenseMonth, netMonth },
    accounts: withBalance,
  });
}
