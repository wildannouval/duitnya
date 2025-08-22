import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// DELETE /api/accounts/:id -> hapus akun
export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    await prisma.account.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 404 });
  }
}
