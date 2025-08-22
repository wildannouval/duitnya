import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// DELETE /api/transactions/:id
// - Jika transaksi bagian dari TRANSFER (punya transferGroupId),
//   hapus SEMUA baris di grup itu.
export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const tx = await prisma.transaction.findUnique({ where: { id: params.id } });
  if (!tx) return NextResponse.json({ error: "Transaksi tidak ditemukan." }, { status: 404 });

  if (tx.transferGroupId) {
    await prisma.transaction.deleteMany({ where: { transferGroupId: tx.transferGroupId } });
    return NextResponse.json({ ok: true, deleted: "group" });
  }

  await prisma.transaction.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true, deleted: "single" });
}
