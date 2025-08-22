import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { randomUUID } from "crypto";

type TxType = "INCOME" | "EXPENSE" | "TRANSFER";

function parseYM(u: URL) {
  const m = u.searchParams.get("month");
  if (m && /^\d{4}-\d{2}$/.test(m)) {
    const [y, mm] = m.split("-").map(Number);
    const start = new Date(Date.UTC(y, mm - 1, 1, 0, 0, 0));
    const end = new Date(Date.UTC(y, mm, 1, 0, 0, 0));
    return { start, end };
  }
  return { start: undefined as Date | undefined, end: undefined as Date | undefined };
}

// GET /api/transactions?month=YYYY-MM&type=...&accountId=...&categoryId=...
export async function GET(req: Request) {
  const u = new URL(req.url);
  const { start, end } = parseYM(u);
  const type = u.searchParams.get("type") as TxType | null;
  const accountId = u.searchParams.get("accountId");
  const categoryId = u.searchParams.get("categoryId");

  const where: any = {};
  if (start && end) where.date = { gte: start, lt: end };
  if (type && ["INCOME", "EXPENSE", "TRANSFER"].includes(type)) where.type = type;
  if (accountId) {
    // cocokkan transaksi biasa & transfer terkait akun tsb
    where.OR = [
      { accountId },
      { fromAccountId: accountId },
      { toAccountId: accountId },
    ];
  }
  if (categoryId) where.categoryId = categoryId;

  const list = await prisma.transaction.findMany({
    where,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(list);
}

// POST /api/transactions
// body (INCOME/EXPENSE): { type, amount, date, accountId, categoryId?, note? }
// body (TRANSFER): { type:"TRANSFER", amount, date, fromAccountId, toAccountId, note? }
export async function POST(req: Request) {
  try {
    const b = await req.json();
    const type = String(b?.type ?? "") as TxType;

    if (type === "INCOME" || type === "EXPENSE") {
      const amount = Math.round(Number(b?.amount ?? 0));
      const dateStr = String(b?.date ?? "");
      const accountId = String(b?.accountId ?? "");
      const categoryId = b?.categoryId ? String(b.categoryId) : undefined;
      const note = b?.note ? String(b.note) : undefined;

      if (!Number.isFinite(amount) || amount <= 0) {
        return NextResponse.json({ error: "amount harus > 0" }, { status: 400 });
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return NextResponse.json({ error: "format tanggal harus YYYY-MM-DD" }, { status: 400 });
      }
      if (!accountId) {
        return NextResponse.json({ error: "accountId wajib" }, { status: 400 });
      }

      const sign = type === "INCOME" ? 1 : -1;
      const created = await prisma.transaction.create({
        data: {
          type,
          amount: sign * amount,
          date: new Date(dateStr + "T00:00:00.000Z"),
          accountId,
          categoryId,
          note,
        },
      });
      return NextResponse.json(created, { status: 201 });
    }

    if (type === "TRANSFER") {
      const amount = Math.round(Number(b?.amount ?? 0));
      const dateStr = String(b?.date ?? "");
      const fromAccountId = String(b?.fromAccountId ?? "");
      const toAccountId = String(b?.toAccountId ?? "");
      const note = b?.note ? String(b.note) : undefined;

      if (!Number.isFinite(amount) || amount <= 0) {
        return NextResponse.json({ error: "amount harus > 0" }, { status: 400 });
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return NextResponse.json({ error: "format tanggal harus YYYY-MM-DD" }, { status: 400 });
      }
      if (!fromAccountId || !toAccountId) {
        return NextResponse.json({ error: "fromAccountId & toAccountId wajib" }, { status: 400 });
      }
      if (fromAccountId === toAccountId) {
        return NextResponse.json({ error: "akun sumber & tujuan tidak boleh sama" }, { status: 400 });
      }

      const gid = randomUUID();

      const [outgoing, incoming] = await prisma.$transaction([
        prisma.transaction.create({
          data: {
            type: "TRANSFER",
            amount: -amount,
            date: new Date(dateStr + "T00:00:00.000Z"),
            fromAccountId,
            toAccountId,
            transferGroupId: gid,
            note,
          },
        }),
        prisma.transaction.create({
          data: {
            type: "TRANSFER",
            amount: +amount,
            date: new Date(dateStr + "T00:00:00.000Z"),
            fromAccountId,
            toAccountId,
            transferGroupId: gid,
            note,
          },
        }),
      ]);

      return NextResponse.json({ groupId: gid, outgoing, incoming }, { status: 201 });
    }

    return NextResponse.json({ error: "type tidak dikenal" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
