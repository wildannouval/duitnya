import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { randomUUID } from "crypto";

type TxType = "INCOME" | "EXPENSE" | "TRANSFER";

type ImportItem = {
  type: TxType;
  date: string; // YYYY-MM-DD
  amount: number; // positif
  accountName?: string; // utk income/expense
  categoryName?: string | null; // optional
  note?: string | null;
  fromAccountName?: string; // utk transfer
  toAccountName?: string;   // utk transfer
};

type Payload = {
  items: ImportItem[];
  createMissingAccounts?: boolean;   // default true
  createMissingCategories?: boolean; // default false
};

// helper
function isValidDateYYYYMMDD(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Payload;
    const items = Array.isArray(body.items) ? body.items : [];
    const createMissingAccounts = body.createMissingAccounts ?? true;
    const createMissingCategories = body.createMissingCategories ?? false;

    if (items.length === 0) {
      return NextResponse.json({ error: "items kosong" }, { status: 400 });
    }

    // cache akun & kategori berdasar nama (case sensitive by default)
    const accountCache = new Map<string, { id: string; name: string }>();
    const categoryCache = new Map<string, { id: string; name: string; type: "INCOME" | "EXPENSE" }>();

    async function ensureAccount(name: string) {
      if (accountCache.has(name)) return accountCache.get(name)!;
      let acc = await prisma.account.findFirst({ where: { name } });
      if (!acc && createMissingAccounts) {
        acc = await prisma.account.create({
          data: { name, type: "BANK", initialBalance: 0 },
        });
      }
      if (!acc) throw new Error(`Akun tidak ditemukan: ${name}`);
      accountCache.set(name, acc);
      return acc;
    }

    async function maybeCategory(name: string | undefined | null, typeHint?: "INCOME" | "EXPENSE") {
      if (!name) return null;
      if (categoryCache.has(name)) return categoryCache.get(name)!;
      let cat = await prisma.category.findFirst({ where: { name } });
      if (!cat && createMissingCategories) {
        // default: budgetable hanya utk EXPENSE
        cat = await prisma.category.create({
          data: {
            name,
            type: typeHint ?? "EXPENSE",
            isBudgetable: (typeHint ?? "EXPENSE") === "EXPENSE",
          },
        });
      }
      if (!cat) return null;
      categoryCache.set(name, cat as any);
      return cat as any;
    }

    const errors: { index: number; message: string }[] = [];
    let created = 0;

    // jalankan dalam transaksi supaya konsisten
    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < items.length; i++) {
        const r = items[i];

        try {
          const type = String(r.type ?? "").toUpperCase() as TxType;
          if (!["INCOME", "EXPENSE", "TRANSFER"].includes(type)) {
            throw new Error("type harus INCOME/EXPENSE/TRANSFER");
          }
          const dateStr = String(r.date ?? "");
          if (!isValidDateYYYYMMDD(dateStr)) throw new Error("format tanggal harus YYYY-MM-DD");
          const d = new Date(dateStr + "T00:00:00.000Z");

          let amount = Math.round(Number(r.amount ?? 0));
          if (!Number.isFinite(amount) || amount === 0) throw new Error("amount tidak valid");
          amount = Math.abs(amount); // gunakan absolut; tanda ditentukan oleh type

          if (type === "TRANSFER") {
            const fromName = r.fromAccountName?.trim();
            const toName = r.toAccountName?.trim();
            if (!fromName || !toName) throw new Error("TRANSFER butuh fromAccountName & toAccountName");
            if (fromName === toName) throw new Error("Akun sumber & tujuan tidak boleh sama");

            const fromAcc = await ensureAccount(fromName);
            const toAcc = await ensureAccount(toName);
            const gid = randomUUID();

            await tx.transaction.create({
              data: {
                type: "TRANSFER",
                amount: -amount,
                date: d,
                fromAccountId: fromAcc.id,
                toAccountId: toAcc.id,
                transferGroupId: gid,
                note: r.note ?? null,
              },
            });
            await tx.transaction.create({
              data: {
                type: "TRANSFER",
                amount: +amount,
                date: d,
                fromAccountId: fromAcc.id,
                toAccountId: toAcc.id,
                transferGroupId: gid,
                note: r.note ?? null,
              },
            });
            created += 2;
          } else {
            const accName = r.accountName?.trim();
            if (!accName) throw new Error(`${type} butuh accountName`);

            const acc = await ensureAccount(accName);
            const typeSign = type === "INCOME" ? +1 : -1;
            const cat = await maybeCategory(r.categoryName?.trim() ?? null, type === "INCOME" ? "INCOME" : "EXPENSE");

            await tx.transaction.create({
              data: {
                type,
                amount: typeSign * amount,
                date: d,
                accountId: acc.id,
                categoryId: cat?.id ?? null,
                note: r.note ?? null,
              },
            });
            created += 1;
          }
        } catch (e: any) {
          errors.push({ index: i, message: e?.message ?? "unknown error" });
        }
      }

      if (errors.length > 0 && created === 0) {
        // kalau semuanya gagal, lempar supaya rollback
        throw new Error("Semua baris gagal diimpor");
      }
    });

    return NextResponse.json({ created, errors });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Bad request" }, { status: 400 });
  }
}
