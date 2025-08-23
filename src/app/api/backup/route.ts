import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  // Ambil semua data
  const [accounts, categories, transactions, debts, debtPayments, subscriptions, budgets] =
    await Promise.all([
      prisma.account.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.category.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.transaction.findMany({ orderBy: [{ date: "asc" }, { createdAt: "asc" }] }),
      prisma.debt.findMany({ orderBy: { createdAt: "asc" } }),
      // FIX: DebtPayment tidak punya createdAt → pakai date
      prisma.debtPayment.findMany({ orderBy: { date: "asc" } }),
      prisma.subscription.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.budget.findMany({ orderBy: { createdAt: "asc" } }),
    ]);

  // Serialize Date → ISO
  const iso = (x: any) =>
    Object.fromEntries(
      Object.entries(x).map(([k, v]) => [k, v instanceof Date ? v.toISOString() : v])
    );

  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      accounts: accounts.map(iso),
      categories: categories.map(iso),
      transactions: transactions.map(iso),
      debts: debts.map(iso),
      debtPayments: debtPayments.map(iso),
      subscriptions: subscriptions.map(iso),
      budgets: budgets.map(iso),
    },
  };

  const fname = `duitnya-backup-${new Date()
    .toISOString()
    .replace(/[:.]/g, "-")}.json`;

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fname}"`,
      "Cache-Control": "no-store",
    },
  });
}
