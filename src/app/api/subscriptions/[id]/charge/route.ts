import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Freq = "WEEKLY" | "MONTHLY" | "YEARLY";

function advance(date: Date, freq: Freq) {
  const d = new Date(date);
  if (freq === "WEEKLY") d.setUTCDate(d.getUTCDate() + 7);
  else if (freq === "MONTHLY") d.setUTCMonth(d.getUTCMonth() + 1);
  else if (freq === "YEARLY") d.setUTCFullYear(d.getUTCFullYear() + 1);
  return d;
}

// POST /api/subscriptions/:id/charge  { amount, date, accountId? }
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const b = await req.json();
    const amount = Math.round(Number(b?.amount ?? 0));
    const dateStr = String(b?.date ?? "");

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "amount harus > 0" }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return NextResponse.json({ error: "format tanggal harus YYYY-MM-DD" }, { status: 400 });
    }

    const sub = await prisma.subscription.findUnique({ where: { id } });
    if (!sub) return NextResponse.json({ error: "Subscription tidak ditemukan" }, { status: 404 });

    const accountId = b?.accountId ? String(b.accountId) : sub.accountId ?? "";
    if (!accountId) {
      return NextResponse.json({ error: "Akun wajib (isi di request atau set default di subscription)" }, { status: 400 });
    }

    // create expense transaction
    const tx = await prisma.transaction.create({
      data: {
        type: "EXPENSE",
        amount: -amount,
        date: new Date(dateStr + "T00:00:00.000Z"),
        accountId,
        note: `Subscription: ${sub.name}`,
      },
    });

    // advance next due
    const next = advance(new Date(sub.nextDueDate), sub.frequency as Freq);
    const updated = await prisma.subscription.update({
      where: { id: sub.id },
      data: { nextDueDate: next },
    });

    return NextResponse.json({ subscription: updated, transaction: tx }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
