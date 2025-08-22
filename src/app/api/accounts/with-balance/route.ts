import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const accounts = await prisma.account.findMany({
    orderBy: { createdAt: "desc" },
  });

  // N+1 tapi cukup untuk app pribadi
  const results = await Promise.all(
    accounts.map(async (acc) => {
      const agg = await prisma.transaction.aggregate({
        _sum: { amount: true },
        where: {
          OR: [
            { accountId: acc.id },      // income/expense biasa
            { fromAccountId: acc.id },  // transfer keluar (negatif)
            { toAccountId: acc.id },    // transfer masuk (positif)
          ],
        },
      });
      const delta = agg._sum.amount ?? 0;
      const balance = acc.initialBalance + delta;
      return { ...acc, balance };
    })
  );

  return NextResponse.json(results);
}
