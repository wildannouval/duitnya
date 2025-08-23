import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type TxType = "INCOME" | "EXPENSE" | "TRANSFER";

function parseDate(s?: string) {
  if (s && /^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(s + "T00:00:00.000Z");
  return new Date();
}

// POST /api/quick-create
// Body:
// - INCOME/EXPENSE: { type, amount, date?, accountId, categoryId?, note? }
// - TRANSFER:       { type:"TRANSFER", amount, date?, fromAccountId, toAccountId, note? }
export async function POST(req: Request) {
  try {
    const b = await req.json();
    const type = String(b?.type ?? "").toUpperCase() as TxType;
    const amountRaw = Number(b?.amount ?? NaN);
    if (!["INCOME", "EXPENSE", "TRANSFER"].includes(type))
      return NextResponse.json({ error: "type invalid" }, { status: 400 });
    if (!Number.isFinite(amountRaw) || amountRaw <= 0)
      return NextResponse.json({ error: "amount harus > 0" }, { status: 400 });

    const date = parseDate(b?.date);
    const note: string | null = b?.note ? String(b.note) : null;

    if (type === "TRANSFER") {
      const fromAccountId = String(b?.fromAccountId ?? "");
      const toAccountId = String(b?.toAccountId ?? "");
      if (!fromAccountId || !toAccountId)
        return NextResponse.json({ error: "fromAccountId & toAccountId wajib" }, { status: 400 });
      if (fromAccountId === toAccountId)
        return NextResponse.json({ error: "Akun asal & tujuan tidak boleh sama" }, { status: 400 });

      const created = await prisma.transaction.create({
        data: {
          type: "TRANSFER",
          amount: Math.round(amountRaw), // transfer pakai angka positif (absolute)
          date,
          fromAccountId,
          toAccountId,
          note: note ?? "Transfer cepat",
        },
      });

      return NextResponse.json({ ok: true, transaction: created }, { status: 201 });
    }

    // INCOME / EXPENSE
    const accountId = String(b?.accountId ?? "");
    if (!accountId) return NextResponse.json({ error: "accountId wajib" }, { status: 400 });

    const categoryId: string | null = b?.categoryId ? String(b.categoryId) : null;

    const signed =
      type === "INCOME" ? Math.round(Math.abs(amountRaw)) : -Math.round(Math.abs(amountRaw));

    const created = await prisma.transaction.create({
      data: {
        type,
        amount: signed,
        date,
        accountId,
        categoryId,
        note: note ?? (type === "INCOME" ? "Pemasukan cepat" : "Pengeluaran cepat"),
      },
    });

    return NextResponse.json({ ok: true, transaction: created }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Bad request" }, { status: 400 });
  }
}
