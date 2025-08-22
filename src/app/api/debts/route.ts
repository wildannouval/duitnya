import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type DebtKind = "HUTANG" | "PIUTANG";

// GET /api/debts
export async function GET() {
  const items = await prisma.debt.findMany({
    orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json(items);
}

// POST /api/debts  { kind, counterpartyName, principalAmount, dueDate? }
export async function POST(req: Request) {
  try {
    const b = await req.json();
    const kind = String(b?.kind ?? "") as DebtKind;
    const counterpartyName = String(b?.counterpartyName ?? "").trim();
    const principalAmount = Math.round(Number(b?.principalAmount ?? 0));
    const dueDateStr = b?.dueDate ? String(b.dueDate) : "";

    if (!["HUTANG", "PIUTANG"].includes(kind)) {
      return NextResponse.json({ error: "kind harus HUTANG/PIUTANG" }, { status: 400 });
    }
    if (!counterpartyName) return NextResponse.json({ error: "Nama pihak wajib" }, { status: 400 });
    if (!Number.isFinite(principalAmount) || principalAmount <= 0) {
      return NextResponse.json({ error: "Jumlah harus > 0" }, { status: 400 });
    }

    const created = await prisma.debt.create({
      data: {
        kind,
        counterpartyName,
        principalAmount,
        remainingAmount: principalAmount,
        dueDate: dueDateStr ? new Date(dueDateStr + "T00:00:00.000Z") : null,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
