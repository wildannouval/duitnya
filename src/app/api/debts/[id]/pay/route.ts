import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// POST /api/debts/:id/pay  { amount, date, accountId }
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const b = await req.json();
    const amount = Math.round(Number(b?.amount ?? 0));
    const dateStr = String(b?.date ?? "");
    const accountId = String(b?.accountId ?? "");

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "amount harus > 0" }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return NextResponse.json({ error: "format tanggal harus YYYY-MM-DD" }, { status: 400 });
    }
    if (!accountId) {
      return NextResponse.json({ error: "accountId wajib" }, { status: 400 });
    }

    const debt = await prisma.debt.findUnique({ where: { id: params.id } });
    if (!debt) return NextResponse.json({ error: "Debt tidak ditemukan" }, { status: 404 });

    // buat transaksi (EXPENSE untuk HUTANG; INCOME untuk PIUTANG)
    const isHutang = debt.kind === "HUTANG";
    const type = isHutang ? "EXPENSE" : "INCOME";
    const tx = await prisma.transaction.create({
      data: {
        type: type as any,
        amount: isHutang ? -amount : +amount,
        date: new Date(dateStr + "T00:00:00.000Z"),
        accountId,
        note: isHutang
          ? `Bayar hutang ke ${debt.counterpartyName}`
          : `Terima piutang dari ${debt.counterpartyName}`,
      },
    });

    // catat payment + update sisa / status
    const newRemaining = Math.max(0, debt.remainingAmount - amount);
    const status = newRemaining === 0 ? "PAID" : "OPEN";

    const payment = await prisma.debtPayment.create({
      data: {
        debtId: debt.id,
        amount,
        date: new Date(dateStr + "T00:00:00.000Z"),
        accountId,
        transactionId: tx.id,
      },
    });

    const updatedDebt = await prisma.debt.update({
      where: { id: debt.id },
      data: { remainingAmount: newRemaining, status: status as any },
    });

    return NextResponse.json({ debt: updatedDebt, payment, transaction: tx }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
