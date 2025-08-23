import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/subscriptions?active=true&days=30
export async function GET(req: Request) {
  const url = new URL(req.url);
  const active = url.searchParams.get("active");
  const days = Number(url.searchParams.get("days") ?? 0);

  const where: any = {};
  if (active === "true") where.isActive = true;
  if (active === "false") where.isActive = false;

  let subs = await prisma.subscription.findMany({
    where,
    orderBy: [{ isActive: "desc" }, { nextDueDate: "asc" }, { createdAt: "asc" }],
  });

  if (Number.isFinite(days) && days > 0) {
    const lim = new Date();
    lim.setDate(lim.getDate() + days);
    subs = subs.filter((s) => new Date(s.nextDueDate) <= lim);
  }

  return NextResponse.json(subs);
}

// POST /api/subscriptions
// { name, amount, frequency: WEEKLY|MONTHLY|YEARLY, nextDueDate: YYYY-MM-DD, accountId?: string, isActive?: boolean }
export async function POST(req: Request) {
  try {
    const b = await req.json();
    const name = String(b?.name ?? "").trim();
    const amount = Math.round(Math.abs(Number(b?.amount ?? 0)));
    const freq = String(b?.frequency ?? "").toUpperCase();
    const nextDue = String(b?.nextDueDate ?? "");
    const accountId = b?.accountId ? String(b.accountId) : null;
    const isActive = b?.isActive ?? true;

    if (!name) return NextResponse.json({ error: "Nama wajib diisi" }, { status: 400 });
    if (!["WEEKLY", "MONTHLY", "YEARLY"].includes(freq))
      return NextResponse.json({ error: "frequency tidak valid" }, { status: 400 });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(nextDue))
      return NextResponse.json({ error: "nextDueDate harus YYYY-MM-DD" }, { status: 400 });
    if (!Number.isFinite(amount) || amount <= 0)
      return NextResponse.json({ error: "amount harus > 0" }, { status: 400 });

    const created = await prisma.subscription.create({
      data: {
        name,
        amount,
        frequency: freq as any,
        nextDueDate: new Date(nextDue + "T00:00:00.000Z"),
        accountId,
        isActive: Boolean(isActive),
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
