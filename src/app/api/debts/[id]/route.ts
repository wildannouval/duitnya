import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// PATCH /api/debts/:id  { status? }
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const b = await req.json();
    const data: any = {};
    if (typeof b?.status === "string" && ["OPEN", "PAID"].includes(b.status)) {
      data.status = b.status;
      if (b.status === "PAID") data.remainingAmount = 0;
    }

    const updated = await prisma.debt.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Gagal update" }, { status: 400 });
  }
}

// DELETE /api/debts/:id
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.debt.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Gagal menghapus" }, { status: 400 });
  }
}
