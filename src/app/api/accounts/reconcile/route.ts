import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Body:
// { accountId: string, actualBalance: number, date?: "YYYY-MM-DD", categoryId?: string, note?: string }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const accountId = String(body?.accountId ?? "");
    const actualBalance = Math.round(Number(body?.actualBalance ?? NaN));
    const dateStr = String(body?.date ?? "");
    const date = /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
      ? new Date(dateStr + "T00:00:00.000Z")
      : new Date();
    const categoryId = body?.categoryId ? String(body.categoryId) : null;
    const note = body?.note ? String(body.note) : `Reconcile saldo`;

    if (!accountId) return NextResponse.json({ error: "accountId wajib" }, { status: 400 });
    if (!Number.isFinite(actualBalance)) {
      return NextResponse.json({ error: "actualBalance tidak valid" }, { status: 400 });
    }

    // hitung balance terhitung seperti di /balances
    const acc = await prisma.account.findUnique({ where: { id: accountId } });
    if (!acc) return NextResponse.json({ error: "Akun tidak ditemukan" }, { status: 404 });

    const [sumAccount, sumInTransfer, sumOutTransfer] = await Promise.all([
      prisma.transaction.aggregate({ _sum: { amount: true }, where: { accountId } }),
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { type: "TRANSFER", toAccountId: accountId },
      }),
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { type: "TRANSFER", fromAccountId: accountId },
      }),
    ]);

    const totalSigned =
      (sumAccount._sum.amount ?? 0) +
      (sumInTransfer._sum.amount ?? 0) -
      (sumOutTransfer._sum.amount ?? 0);

    const computedBalance = acc.initialBalance + totalSigned;
    const delta = actualBalance - computedBalance;

    if (delta === 0) {
      return NextResponse.json({
        ok: true,
        message: "Saldo sudah sesuai. Tidak perlu penyesuaian.",
        computedBalance,
        actualBalance,
        delta: 0,
      });
    }

    // Buat transaksi penyesuaian:
    // delta > 0 => INCOME (positif)
    // delta < 0 => EXPENSE (negatif)
    const type = delta > 0 ? "INCOME" : "EXPENSE";
    const amount = delta > 0 ? delta : -Math.abs(delta);

    const txRow = await prisma.transaction.create({
      data: {
        type: type as any,
        amount,
        date,
        accountId,
        categoryId,
        note,
      },
    });

    return NextResponse.json({
      ok: true,
      createdTransactionId: txRow.id,
      computedBalanceBefore: computedBalance,
      actualBalanceRequested: actualBalance,
      delta,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Bad request" }, { status: 400 });
  }
}
