import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET list kategori
export async function GET() {
  const items = await prisma.category.findMany({ orderBy: [{ type: "asc" }, { name: "asc" }] });
  return NextResponse.json(items);
}

// POST buat kategori
export async function POST(req: Request) {
  try {
    const b = await req.json();
    const name = String(b?.name ?? "").trim();
    const type = String(b?.type ?? "");
    const isBudgetable = Boolean(b?.isBudgetable);
    if (!name) return NextResponse.json({ error: "Nama wajib." }, { status: 400 });
    if (!["INCOME","EXPENSE"].includes(type)) return NextResponse.json({ error: "Jenis tidak valid." }, { status: 400 });

    const created = await prisma.category.create({
      data: { name, type: type as any, isBudgetable },
    });
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
