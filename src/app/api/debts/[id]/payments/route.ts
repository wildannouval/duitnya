import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// POST /api/debts/:id/payments
// body: { date: "YYYY-MM-DD", amount: number, accountId?: string }
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const dateStr = String(body?.date ?? "");
    const amount = Number(body?.amount);
    const accountId = body?.accountId ? String(body.accountId) : undefined;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return NextResponse.json({ error: "Tanggal harus YYYY-MM-DD." }, { status: 400 });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Nominal harus angka > 0." }, { status: 400 });
    }

    const debt = await prisma.debt.findUnique({ where: { id: params.id } });
    if (!debt) return NextResponse.json({ error: "Debt tidak ditemukan." }, { status: 404 });

    if (accountId) {
      // pastikan akun ada
      const acc = await prisma.account.findUnique({ where: { id: accountId } });
      if (!acc) return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 404 });
    }

    const payAmt = Math.round(amount);
    if (payAmt > debt.remainingAmount) {
      return NextResponse.json({ error: "Nominal melebihi sisa." }, { status: 400 });
    }

    const date = new Date(`${dateStr}T00:00:00.000Z`);

    const { payment } = await prisma.$transaction(async (tx) => {
      // 1) buat payment
      const payment = await tx.debtPayment.create({
        data: {
          debtId: params.id,
          date,
          amount: payAmt,
          accountId, // opsional
        },
      });

      // 2) update sisa + status
      const newRemaining = debt.remainingAmount - payAmt;
      await tx.debt.update({
        where: { id: params.id },
        data: {
          remainingAmount: newRemaining,
          status: newRemaining <= 0 ? "PAID" : "OPEN",
        },
      });

      // 3) jika pilih akun → buat transaksi & tautkan ke payment
      if (accountId) {
        const txType = debt.kind === "HUTANG" ? "EXPENSE" : "INCOME" as const;
        const signed = txType === "INCOME" ? payAmt : -payAmt;
        const note =
          debt.kind === "HUTANG"
            ? `Pembayaran hutang: ${debt.counterpartyName}`
            : `Penerimaan piutang: ${debt.counterpartyName}`;

        const linked = await tx.transaction.create({
          data: {
            type: txType,         // INCOME / EXPENSE
            amount: signed,       // INCOME (+), EXPENSE (-)
            date,
            note,
            accountId,
          },
        });

        await tx.debtPayment.update({
          where: { id: payment.id },
          data: { transactionId: linked.id },
        });
      }

      return { payment };
    });

    // kembalikan payment (sekarang punya field transactionId bila ada akun)
    const withTx = await prisma.debtPayment.findUnique({
      where: { id: payment.id },
      include: { debt: true },
    });

    return NextResponse.json(withTx, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
