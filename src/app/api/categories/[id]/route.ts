import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// PATCH update kategori (name/type/isBudgetable)
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const b = await req.json();
    const data: any = {};
    if (typeof b?.name === "string") data.name = b.name.trim();
    if (typeof b?.isBudgetable === "boolean") data.isBudgetable = b.isBudgetable;
    if (typeof b?.type === "string" && ["INCOME","EXPENSE"].includes(b.type)) data.type = b.type;

    const updated = await prisma.category.update({ where: { id: params.id }, data });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Gagal update." }, { status: 400 });
  }
}

// DELETE kategori
export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    await prisma.category.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Gagal menghapus (mungkin sedang dipakai transaksi/budget)." }, { status: 400 });
  }
}
