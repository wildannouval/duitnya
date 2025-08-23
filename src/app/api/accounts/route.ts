import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const accounts = await prisma.account.findMany({
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(accounts);
}

// POST /api/accounts
// { name: string, type: "BANK"|"EWALLET"|"CASH", currency?: string, initialBalance?: number }
export async function POST(req: Request) {
  try {
    const b = await req.json();
    const name = String(b?.name ?? "").trim();
    const type = String(b?.type ?? "");
    const currency = String(b?.currency ?? "IDR").trim().toUpperCase();
    const initialBalance = Math.round(Number(b?.initialBalance ?? 0));

    if (!name) return NextResponse.json({ error: "Nama akun wajib diisi" }, { status: 400 });
    if (!["BANK", "EWALLET", "CASH"].includes(type))
      return NextResponse.json({ error: "Tipe akun tidak valid" }, { status: 400 });
    if (!Number.isFinite(initialBalance))
      return NextResponse.json({ error: "Initial balance tidak valid" }, { status: 400 });

    const created = await prisma.account.create({
      data: { name, type: type as any, currency, initialBalance },
    });

    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
