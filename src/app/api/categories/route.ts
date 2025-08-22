import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/categories -> list kategori
export async function GET() {
  const categories = await prisma.category.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(categories);
}

// POST /api/categories -> tambah kategori
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = (body?.name ?? "").trim();
    const type = body?.type as "INCOME" | "EXPENSE";
    const isBudgetable = Boolean(body?.isBudgetable ?? true);

    if (!name) {
      return NextResponse.json({ error: "Nama kategori wajib diisi." }, { status: 400 });
    }
    if (!["INCOME", "EXPENSE"].includes(type)) {
      return NextResponse.json({ error: "Jenis kategori tidak valid." }, { status: 400 });
    }

    try {
      const created = await prisma.category.create({
        data: { name, type, isBudgetable },
      });
      return NextResponse.json(created, { status: 201 });
    } catch (e: any) {
      // Unique constraint name+type
      if (e?.code === "P2002") {
        return NextResponse.json(
          { error: "Kategori dengan nama & jenis yang sama sudah ada." },
          { status: 409 }
        );
      }
      throw e;
    }
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
