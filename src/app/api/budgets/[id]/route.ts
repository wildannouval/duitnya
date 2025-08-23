import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// PATCH /api/budgets/:id  { amount }
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const b = await req.json();
    const amount = Math.round(Number(b?.amount ?? 0));
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "amount harus > 0" }, { status: 400 });
    }
    const upd = await prisma.budget.update({
      where: { id: params.id },
      data: { amount },
      include: { category: true },
    });
    return NextResponse.json({ ...upd, spent: 0 });
  } catch {
    return NextResponse.json({ error: "Gagal update" }, { status: 400 });
  }
}

// DELETE /api/budgets/:id
export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    await prisma.budget.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Gagal menghapus" }, { status: 400 });
  }
}
