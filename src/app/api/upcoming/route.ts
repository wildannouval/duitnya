import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function addDays(d: Date, days: number) {
  return new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const daysParam = Number(url.searchParams.get("days") ?? "7");
  const days = Number.isFinite(daysParam) ? Math.max(1, Math.min(daysParam, 60)) : 7;

  const now = new Date();
  const until = addDays(now, days);

  // Langganan aktif yang due ≤ N hari lagi
  const subs = await prisma.subscription.findMany({
    where: {
      isActive: true,
      nextDueDate: { lte: until },
    },
    orderBy: { nextDueDate: "asc" },
    include: { account: true },
  });

  // Hutang/Piutang OPEN yang punya dueDate dan due ≤ N hari
  const debts = await prisma.debt.findMany({
    where: {
      status: "OPEN",
      dueDate: { not: null, lte: until },
    },
    orderBy: { dueDate: "asc" },
  });

  const subscriptions = subs.map((s) => {
    const daysTo = Math.ceil((+s.nextDueDate - +now) / 86_400_000);
    return {
      kind: "SUBSCRIPTION" as const,
      id: s.id,
      name: s.name,
      amount: s.amount,
      dueDate: s.nextDueDate,
      daysTo,
      overdue: daysTo < 0,
      accountName: s.account?.name ?? null,
    };
  });

  const mappedDebts = debts.map((d) => {
    const daysTo = d.dueDate ? Math.ceil((+d.dueDate - +now) / 86_400_000) : 0;
    return {
      kind: "DEBT" as const,
      id: d.id,
      type: d.kind, // "HUTANG" | "PIUTANG"
      counterpartyName: d.counterpartyName,
      remainingAmount: d.remainingAmount,
      dueDate: d.dueDate!,
      daysTo,
      overdue: daysTo < 0,
    };
  });

  return NextResponse.json({
    generatedAt: now.toISOString(),
    days,
    subscriptions,
    debts: mappedDebts,
  });
}
