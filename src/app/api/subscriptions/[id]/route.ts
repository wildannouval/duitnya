import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();

    const data: any = {};
    if (typeof body?.name === "string") data.name = body.name.trim();
    if (Number.isFinite(body?.amount)) data.amount = Math.max(1, Math.round(Number(body.amount)));
    if (typeof body?.isActive === "boolean") data.isActive = body.isActive;
    if (body?.frequency && ["WEEKLY","MONTHLY","YEARLY"].includes(body.frequency)) data.frequency = body.frequency;
    if (typeof body?.accountId === "string") {
      if (body.accountId.length === 0) data.accountId = null; // clear
      else {
        const acc = await prisma.account.findUnique({ where: { id: String(body.accountId) } });
        if (!acc) return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 404 });
        data.accountId = String(body.accountId);
      }
    }
    if (typeof body?.nextDueDate === "string") {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(body.nextDueDate))
        return NextResponse.json({ error: "nextDueDate harus YYYY-MM-DD." }, { status: 400 });
      data.nextDueDate = new Date(`${body.nextDueDate}T00:00:00.000Z`);
    }

    const updated = await prisma.subscription.update({
      where: { id: params.id },
      data,
      include: { account: true },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Gagal update." }, { status: 400 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    await prisma.subscription.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Gagal menghapus." }, { status: 400 });
  }
}
