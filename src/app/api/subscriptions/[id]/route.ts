import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// PATCH /api/subscriptions/:id
// { name?, amount?, frequency?, nextDueDate?, accountId?, isActive? }
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = String(params.id);
    const b = await req.json();

    const data: any = {};
    if (b.name != null) data.name = String(b.name).trim();
    if (b.amount != null) data.amount = Math.round(Math.abs(Number(b.amount)));
    if (b.frequency != null) {
      const f = String(b.frequency).toUpperCase();
      if (!["WEEKLY", "MONTHLY", "YEARLY"].includes(f))
        return NextResponse.json({ error: "frequency tidak valid" }, { status: 400 });
      data.frequency = f;
    }
    if (b.nextDueDate != null) {
      const nd = String(b.nextDueDate);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(nd))
        return NextResponse.json({ error: "nextDueDate harus YYYY-MM-DD" }, { status: 400 });
      data.nextDueDate = new Date(nd + "T00:00:00.000Z");
    }
    if (b.accountId !== undefined) data.accountId = b.accountId ? String(b.accountId) : null;
    if (b.isActive !== undefined) data.isActive = Boolean(b.isActive);

    const updated = await prisma.subscription.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}

// DELETE /api/subscriptions/:id
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const id = String(params.id);
    await prisma.subscription.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
