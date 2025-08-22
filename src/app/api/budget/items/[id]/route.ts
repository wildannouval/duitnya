import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    await prisma.budgetItem.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Item budget tidak ditemukan." }, { status: 404 });
  }
}
