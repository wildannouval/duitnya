import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function getMonthFromSearch(url: string) {
  const u = new URL(url);
  const q = u.searchParams.get("month");
  if (q && /^\d{4}-\d{2}$/.test(q)) return q;
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// GET /api/budget?month=YYYY-MM
export async function GET(req: Request) {
  const month = getMonthFromSearch(req.url);

  const budget = await prisma.budget.findUnique({
    where: { month },
    include: {
      items: {
        include: { category: true },
        orderBy: { id: "desc" },
      },
    },
  });

  return NextResponse.json(budget ?? { id: null, month, items: [] });
}

// POST /api/budget  { month, categoryId, amountPlanned }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const month = String(body?.month ?? "");
    const categoryId = String(body?.categoryId ?? "");
    const amountPlanned = Number(body?.amountPlanned);

    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: "Format month harus YYYY-MM." }, { status: 400 });
    }
    if (!categoryId) {
      return NextResponse.json({ error: "categoryId wajib diisi." }, { status: 400 });
    }
    if (!Number.isFinite(amountPlanned) || amountPlanned <= 0) {
      return NextResponse.json({ error: "amountPlanned harus angka > 0." }, { status: 400 });
    }

    const cat = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!cat) return NextResponse.json({ error: "Kategori tidak ditemukan." }, { status: 404 });
    if (cat.type !== "EXPENSE" || !cat.isBudgetable) {
      return NextResponse.json({ error: "Budget hanya untuk kategori EXPENSE & budgetable." }, { status: 400 });
    }

    // pastikan Budget untuk month ada
    const budget = await prisma.budget.upsert({
      where: { month },
      update: {},
      create: { month },
    });

    // cari item: unik per (budgetId, categoryId)
    const existing = await prisma.budgetItem.findFirst({
      where: { budgetId: budget.id, categoryId },
    });

    let saved;
    if (existing) {
      saved = await prisma.budgetItem.update({
        where: { id: existing.id },
        data: { amountPlanned },
      });
    } else {
      saved = await prisma.budgetItem.create({
        data: { budgetId: budget.id, categoryId, amountPlanned },
      });
    }

    const result = await prisma.budgetItem.findUnique({
      where: { id: saved.id },
      include: { category: true },
    });

    return NextResponse.json(result, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
