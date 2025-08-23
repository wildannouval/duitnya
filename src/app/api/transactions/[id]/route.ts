import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// DELETE /api/transactions/:id
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const tx = await prisma.transaction.findUnique({ where: { id } });
    if (!tx) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (tx.type === "TRANSFER" && tx.transferGroupId) {
      await prisma.transaction.deleteMany({ where: { transferGroupId: tx.transferGroupId } });
      return NextResponse.json({ ok: true, deleted: "transfer-pair" });
    }

    await prisma.transaction.delete({ where: { id: tx.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Gagal menghapus" }, { status: 400 });
  }
}
