import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Freq = "WEEKLY" | "MONTHLY" | "YEARLY";

function parseDate(d: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  return new Date(`${d}T00:00:00.000Z`);
}

// GET /api/subscriptions
export async function GET() {
  const subs = await prisma.subscription.findMany({
    orderBy: [{ isActive: "desc" }, { nextDueDate: "asc" }],
    include: { account: true },
  });
  return NextResponse.json(subs);
}

// POST /api/subscriptions
// body: { name, amount, frequency: "WEEKLY"|"MONTHLY"|"YEARLY", nextDueDate: "YYYY-MM-DD", accountId?: string, isActive?: boolean }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = String(body?.name ?? "").trim();
    const amount = Number(body?.amount);
    const frequency = body?.frequency as Freq;
    const nextDueDateStr = String(body?.nextDueDate ?? "");
    const accountId = body?.accountId ? String(body.accountId) : undefined;
    const isActive = body?.isActive ?? true;

    if (!name) return NextResponse.json({ error: "Nama wajib diisi." }, { status: 400 });
    if (!Number.isFinite(amount) || amount <= 0)
      return NextResponse.json({ error: "Nominal harus angka > 0." }, { status: 400 });
    if (!["WEEKLY", "MONTHLY", "YEARLY"].includes(frequency))
      return NextResponse.json({ error: "Frequency tidak valid." }, { status: 400 });

    const dt = parseDate(nextDueDateStr);
    if (!dt) return NextResponse.json({ error: "nextDueDate harus YYYY-MM-DD." }, { status: 400 });

    if (accountId) {
      const acc = await prisma.account.findUnique({ where: { id: accountId } });
      if (!acc) return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 404 });
    }

    const created = await prisma.subscription.create({
      data: {
        name,
        amount: Math.round(amount),
        frequency,
        nextDueDate: dt,
        isActive: Boolean(isActive),
        accountId,
      },
      include: { account: true },
    });

    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
