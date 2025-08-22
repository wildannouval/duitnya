import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { randomUUID } from "crypto";

// GET /api/transactions -> list transaksi (termasuk relasi utk tampilan)
export async function GET() {
  const txs = await prisma.transaction.findMany({
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    include: {
      account: true,
      fromAccount: true,
      toAccount: true,
      category: true,
    },
  });
  return NextResponse.json(txs);
}

// POST /api/transactions -> tambah transaksi (INCOME/EXPENSE/TRANSFER)
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const type = body?.type as "INCOME" | "EXPENSE" | "TRANSFER";
    const amountRaw = Number(body?.amount);
    const dateStr = String(body?.date ?? "");
    const note = (body?.note ?? "").trim();

    if (!["INCOME", "EXPENSE", "TRANSFER"].includes(type)) {
      return NextResponse.json({ error: "Jenis transaksi tidak valid." }, { status: 400 });
    }
    if (!Number.isFinite(amountRaw) || amountRaw <= 0) {
      return NextResponse.json({ error: "Nominal harus angka > 0." }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return NextResponse.json({ error: "Format tanggal harus YYYY-MM-DD." }, { status: 400 });
    }
    const date = new Date(`${dateStr}T00:00:00.000Z`);
    const amt = Math.round(Math.abs(amountRaw)); // rupiah integer

    if (type === "TRANSFER") {
      const fromAccountId = String(body?.fromAccountId ?? "");
      const toAccountId = String(body?.toAccountId ?? "");
      if (!fromAccountId || !toAccountId || fromAccountId === toAccountId) {
        return NextResponse.json({ error: "Akun sumber & tujuan wajib diisi dan tidak boleh sama." }, { status: 400 });
      }

      // pastikan akun ada
      const [fromAcc, toAcc] = await Promise.all([
        prisma.account.findUnique({ where: { id: fromAccountId } }),
        prisma.account.findUnique({ where: { id: toAccountId } }),
      ]);
      if (!fromAcc || !toAcc) {
        return NextResponse.json({ error: "Akun sumber/tujuan tidak ditemukan." }, { status: 404 });
      }

      const groupId = randomUUID();
      const [outTx, inTx] = await prisma.$transaction([
        prisma.transaction.create({
          data: {
            type: "TRANSFER",
            amount: -amt,
            date,
            note,
            fromAccountId,
            transferGroupId: groupId,
          },
        }),
        prisma.transaction.create({
          data: {
            type: "TRANSFER",
            amount: amt,
            date,
            note,
            toAccountId,
            transferGroupId: groupId,
          },
        }),
      ]);

      const created = await prisma.transaction.findMany({
        where: { transferGroupId: groupId },
        include: { fromAccount: true, toAccount: true },
        orderBy: { amount: "asc" }, // keluar (-) dulu lalu masuk (+)
      });
      return NextResponse.json(created, { status: 201 });
    }

    // INCOME / EXPENSE
    const accountId = String(body?.accountId ?? "");
    if (!accountId) {
      return NextResponse.json({ error: "Akun wajib diisi." }, { status: 400 });
    }
    const account = await prisma.account.findUnique({ where: { id: accountId } });
    if (!account) {
      return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 404 });
    }

    const categoryId = body?.categoryId ? String(body.categoryId) : undefined;
    if (categoryId) {
      const category = await prisma.category.findUnique({ where: { id: categoryId } });
      if (!category) {
        return NextResponse.json({ error: "Kategori tidak ditemukan." }, { status: 404 });
      }
      if (type === "INCOME" && category.type !== "INCOME") {
        return NextResponse.json({ error: "Kategori tidak sesuai (harus INCOME)." }, { status: 400 });
      }
      if (type === "EXPENSE" && category.type !== "EXPENSE") {
        return NextResponse.json({ error: "Kategori tidak sesuai (harus EXPENSE)." }, { status: 400 });
      }
    }

    const signed = type === "INCOME" ? amt : -amt;

    const created = await prisma.transaction.create({
      data: {
        type,
        amount: signed,
        date,
        note,
        accountId,
        categoryId,
      },
      include: { account: true, category: true },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
