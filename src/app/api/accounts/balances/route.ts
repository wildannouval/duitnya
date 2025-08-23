import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  // Ambil semua akun
  const accounts = await prisma.account.findMany({
    orderBy: { createdAt: "asc" },
  });

  // Hitung saldo terhitung per akun:
  // saldo = initialBalance
  //       + sum(amount) untuk transaksi INCOME/EXPENSE di accountId tsb (signed)
  //       + sum(amount) transfer masuk (toAccountId)
  //       - sum(amount) transfer keluar (fromAccountId)
  const results = await Promise.all(
    accounts.map(async (a) => {
      const sumAccount = await prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { accountId: a.id },
      });

      const sumInTransfer = await prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { type: "TRANSFER", toAccountId: a.id },
      });

      const sumOutTransfer = await prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { type: "TRANSFER", fromAccountId: a.id },
      });

      const totalSigned =
        (sumAccount._sum.amount ?? 0) +
        (sumInTransfer._sum.amount ?? 0) -
        (sumOutTransfer._sum.amount ?? 0);

      const computedBalance = a.initialBalance + totalSigned;

      return {
        id: a.id,
        name: a.name,
        type: a.type,
        currency: a.currency,
        initialBalance: a.initialBalance,
        computedBalance,
        createdAt: a.createdAt,
      };
    })
  );

  return NextResponse.json(results);
}
