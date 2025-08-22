import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// DELETE /api/categories/:id
export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    await prisma.category.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Kategori tidak ditemukan." }, { status: 404 });
  }
}
