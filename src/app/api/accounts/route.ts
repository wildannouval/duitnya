import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET list akun
export async function GET() {
  const items = await prisma.account.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(items);
}

// POST buat akun
export async function POST(req: Request) {
  try {
    const b = await req.json();
    const name = String(b?.name ?? "").trim();
    const type = String(b?.type ?? "");
    const initialBalance = Math.round(Number(b?.initialBalance ?? 0));
    if (!name) return NextResponse.json({ error: "Nama wajib." }, { status: 400 });
    if (!["BANK","EWALLET","CASH"].includes(type)) return NextResponse.json({ error: "Jenis tidak valid." }, { status: 400 });

    const created = await prisma.account.create({
      data: { name, type: type as any, initialBalance },
    });
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
