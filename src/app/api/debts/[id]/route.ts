import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// DELETE /api/debts/:id
// Catatan: akan gagal kalau masih punya payments (foreign key). Hapus payments dulu.
export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    await prisma.debt.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Tidak bisa menghapus (mungkin masih ada pembayaran)." }, { status: 400 });
  }
}

// PATCH /api/debts/:id  { status: "OPEN" | "PAID" }
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const status = String(body?.status);
    if (!["OPEN", "PAID"].includes(status)) {
      return NextResponse.json({ error: "Status tidak valid." }, { status: 400 });
    }

    const debt = await prisma.debt.update({
      where: { id: params.id },
      data: { status },
    });
    return NextResponse.json(debt);
  } catch {
    return NextResponse.json({ error: "Gagal update." }, { status: 400 });
  }
}
