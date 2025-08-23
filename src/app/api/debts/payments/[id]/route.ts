import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// DELETE /api/debts/payments/:id
// - Balikkan sisa debt
// - Jika payment tertaut ke transaction, hapus juga transaksinya
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const p = await prisma.debtPayment.findUnique({ where: { id } });
    if (!p) return NextResponse.json({ error: "Payment tidak ditemukan." }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      // hapus transaksi tertaut (jika ada)
      if (p.transactionId) {
        await tx.transaction.delete({ where: { id: p.transactionId } });
      }

      // hapus payment
      await tx.debtPayment.delete({ where: { id } });

      // kembalikan sisa & set OPEN
      const d = await tx.debt.findUnique({ where: { id: p.debtId } });
      if (d) {
        const newRemaining = d.remainingAmount + p.amount;
        await tx.debt.update({
          where: { id: d.id },
          data: { remainingAmount: newRemaining, status: "OPEN" },
        });
      }
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Gagal menghapus payment." }, { status: 400 });
  }
}
