import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function validYM(ym: string) {
  return /^\d{4}-\d{2}$/.test(ym);
}

// POST /api/budgets/copy  { fromMonth, toMonth, overwrite?: boolean, factor?: number }
export async function POST(req: Request) {
  try {
    const b = await req.json();
    const fromMonth: string = String(b?.fromMonth ?? "");
    const toMonth: string = String(b?.toMonth ?? "");
    const overwrite: boolean = Boolean(b?.overwrite ?? false);
    const factorRaw = Number(b?.factor ?? 1);
    const factor = Number.isFinite(factorRaw) && factorRaw > 0 ? factorRaw : 1;

    if (!validYM(fromMonth) || !validYM(toMonth)) {
      return NextResponse.json({ error: "fromMonth/toMonth harus YYYY-MM" }, { status: 400 });
    }
    if (fromMonth === toMonth) {
      return NextResponse.json({ error: "fromMonth dan toMonth tidak boleh sama" }, { status: 400 });
    }

    const src = await prisma.budget.findMany({
      where: { month: fromMonth },
      include: { category: true },
    });
    if (src.length === 0) {
      return NextResponse.json({ created: 0, updated: 0, skipped: 0, message: "Tidak ada budget di bulan sumber." });
    }

    const toExisting = await prisma.budget.findMany({
      where: { month: toMonth },
      select: { categoryId: true },
    });
    const exists = new Set(toExisting.map((r) => r.categoryId));

    let created = 0;
    let updated = 0;
    let skipped = 0;

    await prisma.$transaction(async (tx) => {
      if (overwrite) {
        for (const s of src) {
          const amount = Math.max(1, Math.round(s.amount * factor));
          await tx.budget.upsert({
            where: { month_categoryId: { month: toMonth, categoryId: s.categoryId } },
            update: { amount },
            create: { month: toMonth, categoryId: s.categoryId, amount },
          });
          if (exists.has(s.categoryId)) updated++;
          else created++;
        }
      } else {
        const data = src
          .filter((s) => !exists.has(s.categoryId))
          .map((s) => ({
            month: toMonth,
            categoryId: s.categoryId,
            amount: Math.max(1, Math.round(s.amount * factor)),
          }));
        if (data.length) {
          // NOTE: hapus skipDuplicates — tidak didukung di setup ini
          const res = await tx.budget.createMany({ data });
          created += res.count;
        }
        skipped += src.length - created; // sisanya yang sudah ada di toMonth
      }
    });

    return NextResponse.json({ created, updated, skipped });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
