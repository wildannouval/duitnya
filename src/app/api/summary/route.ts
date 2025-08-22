import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/summary?month=YYYY-MM  (month hanya untuk label; saldo dihitung per saat ini)
export async function GET(req: Request) {
  const u = new URL(req.url);
  const month = u.searchParams.get("month") ?? "";

  const accounts = await prisma.account.findMany({ orderBy: { createdAt: "asc" } });

  const result = [];
  let totalBalance = 0;

  for (const acc of accounts) {
    // sum transaksi biasa
    const normal = await prisma.transaction.aggregate({
      where: { accountId: acc.id },
      _sum: { amount: true },
    });
    // sum transfer (keluar & masuk)
    const outT = await prisma.transaction.aggregate({
      where: { type: "TRANSFER", fromAccountId: acc.id },
      _sum: { amount: true },
    });
    const inT = await prisma.transaction.aggregate({
      where: { type: "TRANSFER", toAccountId: acc.id },
      _sum: { amount: true },
    });

    const sumNormal = normal._sum.amount ?? 0;
    const sumOut = outT._sum.amount ?? 0; // sudah bertanda negatif
    const sumIn = inT._sum.amount ?? 0;   // sudah bertanda positif

    const balance = acc.initialBalance + sumNormal + sumOut + sumIn;
    totalBalance += balance;

    result.push({
      id: acc.id,
      name: acc.name,
      type: acc.type,
      initialBalance: acc.initialBalance,
      balance,
    });
  }

  return NextResponse.json({
    period: month || new Date().toISOString().slice(0, 7),
    accounts: result,
    totals: { totalBalance },
  });
}
