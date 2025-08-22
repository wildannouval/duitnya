import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/accounts -> list akun
export async function GET() {
  const accounts = await prisma.account.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(accounts);
}

// POST /api/accounts -> tambah akun
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = (body?.name ?? "").trim();
    const type = body?.type as "BANK" | "EWALLET" | "CASH";
    const initialBalance = Number(body?.initialBalance);

    if (!name) {
      return NextResponse.json({ error: "Nama akun wajib diisi." }, { status: 400 });
    }
    if (!["BANK", "EWALLET", "CASH"].includes(type)) {
      return NextResponse.json({ error: "Jenis akun tidak valid." }, { status: 400 });
    }
    if (!Number.isFinite(initialBalance) || initialBalance < 0) {
      return NextResponse.json({ error: "Saldo awal harus angka ≥ 0." }, { status: 400 });
    }

    const created = await prisma.account.create({
      data: {
        name,
        type,
        initialBalance,
        currency: "IDR",
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
