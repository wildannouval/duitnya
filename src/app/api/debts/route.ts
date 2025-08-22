import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/debts?kind=HUTANG|PIUTANG&status=OPEN|PAID
export async function GET(req: Request) {
  const u = new URL(req.url);
  const kind = u.searchParams.get("kind") as "HUTANG" | "PIUTANG" | null;
  const status = u.searchParams.get("status") as "OPEN" | "PAID" | null;

  const debts = await prisma.debt.findMany({
    where: {
      ...(kind ? { kind } : {}),
      ...(status ? { status } : {}),
    },
    include: {
      payments: { orderBy: { date: "desc" } },
    },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(debts);
}

// POST /api/debts
// body: { kind: "HUTANG"|"PIUTANG", counterpartyName: string, principalAmount: number, dueDate?: "YYYY-MM-DD" }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const kind = body?.kind as "HUTANG" | "PIUTANG";
    const counterpartyName = String(body?.counterpartyName ?? "").trim();
    const principalAmount = Number(body?.principalAmount);
    const dueStr = body?.dueDate ? String(body.dueDate) : null;

    if (!["HUTANG", "PIUTANG"].includes(kind)) {
      return NextResponse.json({ error: "kind harus HUTANG atau PIUTANG." }, { status: 400 });
    }
    if (!counterpartyName) {
      return NextResponse.json({ error: "Nama pihak wajib diisi." }, { status: 400 });
    }
    if (!Number.isFinite(principalAmount) || principalAmount <= 0) {
      return NextResponse.json({ error: "Nominal pokok harus angka > 0." }, { status: 400 });
    }

    const dueDate = dueStr && /^\d{4}-\d{2}-\d{2}$/.test(dueStr)
      ? new Date(`${dueStr}T00:00:00.000Z`)
      : null;

    const created = await prisma.debt.create({
      data: {
        kind,
        counterpartyName,
        principalAmount: Math.round(principalAmount),
        remainingAmount: Math.round(principalAmount),
        dueDate,
        status: "OPEN",
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
