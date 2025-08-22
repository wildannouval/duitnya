import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function addMonthsKeepDay(d: Date, months: number) {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const day = d.getUTCDate();
  const next = new Date(Date.UTC(y, m + months, 1, 0, 0, 0));
  const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
  next.setUTCDate(Math.min(day, lastDay));
  return next;
}
function nextDue(current: Date, freq: "WEEKLY" | "MONTHLY" | "YEARLY") {
  if (freq === "WEEKLY") return new Date(current.getTime() + 7 * 24 * 60 * 60 * 1000);
  if (freq === "MONTHLY") return addMonthsKeepDay(current, 1);
  return addMonthsKeepDay(current, 12);
}

// POST /api/subscriptions/:id/charge
// body: { date?: "YYYY-MM-DD", amount?: number, accountId?: string }
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const overrideDate = typeof body?.date === "string" ? body.date : null;
    const overrideAmount = Number.isFinite(body?.amount) ? Math.round(Number(body.amount)) : null;
    const overrideAccountId = typeof body?.accountId === "string" ? String(body.accountId) : null;

    const sub = await prisma.subscription.findUnique({ where: { id: params.id } });
    if (!sub) return NextResponse.json({ error: "Subscription tidak ditemukan." }, { status: 404 });
    if (!sub.isActive) return NextResponse.json({ error: "Subscription tidak aktif." }, { status: 400 });

    const date =
      overrideDate && /^\d{4}-\d{2}-\d{2}$/.test(overrideDate)
        ? new Date(`${overrideDate}T00:00:00.000Z`)
        : sub.nextDueDate;

    const amount = overrideAmount && overrideAmount > 0 ? overrideAmount : sub.amount;

    const accountId = overrideAccountId ?? sub.accountId;
    if (!accountId) return NextResponse.json({ error: "Akun harus dipilih saat charge." }, { status: 400 });

    const acc = await prisma.account.findUnique({ where: { id: accountId } });
    if (!acc) return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 404 });

    const next = nextDue(sub.nextDueDate, sub.frequency);

    const result = await prisma.$transaction(async (tx) => {
      // 1) buat transaksi EXPENSE
      const t = await tx.transaction.create({
        data: {
          type: "EXPENSE",
          amount: -Math.round(amount),
          date,
          note: `Langganan: ${sub.name}`,
          accountId,
        },
      });

      // 2) majukan due date
      const updatedSub = await tx.subscription.update({
        where: { id: params.id },
        data: { nextDueDate: next },
        include: { account: true },
      });

      return { transaction: t, subscription: updatedSub };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
