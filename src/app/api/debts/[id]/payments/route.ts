import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// POST /api/debts/:id/payments
// Body:
// { amount: number, date?: string(YYYY-MM-DD), accountId?: string, categoryId?: string, note?: string, createTransaction?: boolean }
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const debtId = String(id);
    const body = await req.json();

    const amountRaw = Number(body?.amount ?? 0);
    const amount = Math.round(Math.abs(amountRaw));
    const dateStr = String(body?.date ?? "");
    const date = /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? new Date(dateStr + "T00:00:00.000Z") : new Date();
    const accountId: string | undefined = body?.accountId || undefined;
    const categoryId: string | undefined = body?.categoryId || undefined;
    const note: string | null = body?.note ? String(body.note) : null;
    const createTransaction: boolean = Boolean(body?.createTransaction ?? false);

    if (!debtId) return NextResponse.json({ error: "debtId wajib" }, { status: 400 });
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "amount harus angka > 0" }, { status: 400 });
    }

    const debt = await prisma.debt.findUnique({ where: { id: debtId } });
    if (!debt) return NextResponse.json({ error: "Debt tidak ditemukan" }, { status: 404 });

    // Batasi amount agar tidak melebihi remainingAmount (opsional, agar aman)
    const payAmount = Math.min(amount, Math.max(0, debt.remainingAmount));

    if (payAmount <= 0) {
      return NextResponse.json({ error: "Debt sudah lunas atau amount tidak valid" }, { status: 400 });
    }

    let createdTxId: string | null = null;

    const result = await prisma.$transaction(async (tx) => {
      // Opsional: buat transaksi sesuai jenis hutang/piutang
      if (createTransaction) {
        if (!accountId) {
          throw new Error("accountId wajib jika createTransaction = true");
        }

        // kind: "HUTANG" => bayar = EXPENSE (-)
        // kind: "PIUTANG" => terima = INCOME (+)
        const isHutang = String(debt.kind) === "HUTANG";
        const txType = isHutang ? "EXPENSE" : "INCOME";
        const signedAmount = isHutang ? -payAmount : +payAmount;

        const txRow = await tx.transaction.create({
          data: {
            type: txType as any,
            amount: signedAmount,
            date,
            accountId,
            categoryId: categoryId ?? null,
            note: note ?? `Debt payment ${isHutang ? "(HUTANG)" : "(PIUTANG)"} — ${debt.counterpartyName}`,
          },
          select: { id: true },
        });
        createdTxId = txRow.id;
      }

      // Buat DebtPayment
      const payment = await tx.debtPayment.create({
        data: {
          debtId,
          amount: payAmount,
          date,
          accountId: accountId ?? null,
          transactionId: createdTxId,
        },
      });

      // Update remainingAmount
      await tx.debt.update({
        where: { id: debtId },
        data: {
          remainingAmount: Math.max(0, debt.remainingAmount - payAmount),
          // (Opsional) Jika kamu punya field status & enum-nya ada "PAID" / "LUNAS",
          // boleh aktifkan baris di bawah:
          // status: debt.remainingAmount - payAmount <= 0 ? "PAID" : debt.status,
        },
      });

      return payment;
    });

    // Ambil ringkas info balik
    const updated = await prisma.debt.findUnique({
      where: { id: debtId },
      select: { id: true, remainingAmount: true, kind: true, counterpartyName: true },
    });

    return NextResponse.json({
      ok: true,
      payment: result,
      linkedTransactionId: createdTxId,
      debt: updated,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Bad request" }, { status: 400 });
  }
}
