import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// helper geser due date sesuai frequency
function advanceDue(dt: Date, freq: "WEEKLY" | "MONTHLY" | "YEARLY") {
  const d = new Date(dt);
  if (freq === "WEEKLY") {
    d.setDate(d.getDate() + 7);
  } else if (freq === "MONTHLY") {
    const day = d.getDate();
    d.setMonth(d.getMonth() + 1);
    if (d.getDate() < day) d.setDate(0); // handle akhir bulan
  } else if (freq === "YEARLY") {
    d.setFullYear(d.getFullYear() + 1);
  }
  return d;
}

// POST /api/subscriptions/:id/pay
// body: { date?: YYYY-MM-DD, accountId?: string, categoryId?: string, note?: string }
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const idStr = String(id);
    const b = await req.json();

    const sub = await prisma.subscription.findUnique({ where: { id: idStr } });
    if (!sub) return NextResponse.json({ error: "Subscription tidak ditemukan" }, { status: 404 });
    if (!sub.isActive)
      return NextResponse.json({ error: "Subscription tidak aktif" }, { status: 400 });

    const dateStr = String(b?.date ?? "");
    const date = /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
      ? new Date(dateStr + "T00:00:00.000Z")
      : new Date();

    const accountId: string | null =
      (b?.accountId ? String(b.accountId) : sub.accountId) ?? null;
    if (!accountId)
      return NextResponse.json({ error: "accountId wajib (di body atau pada subscription)" }, { status: 400 });

    const categoryId: string | null = b?.categoryId ? String(b.categoryId) : null;
    const note: string | null = b?.note ? String(b.note) : null;

    let txId: string | null = null;

    const nextDue = advanceDue(sub.nextDueDate, sub.frequency as any);

    const result = await prisma.$transaction(async (tx) => {
      // buat transaksi EXPENSE (langganan)
      const t = await tx.transaction.create({
        data: {
          type: "EXPENSE",
          amount: -Math.abs(sub.amount),
          date,
          accountId,
          categoryId,
          note: note ?? `Langganan: ${sub.name}`,
        },
        select: { id: true },
      });
      txId = t.id;

      // majukan due date
      const updatedSub = await tx.subscription.update({
        where: { id: idStr },
        data: { nextDueDate: nextDue },
      });

      return { txId: t.id, subscription: updatedSub };
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Bad request" }, { status: 400 });
  }
}
