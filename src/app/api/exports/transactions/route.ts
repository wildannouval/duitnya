import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type TxType = "INCOME" | "EXPENSE" | "TRANSFER";

function parseYM(u: URL) {
  const m = u.searchParams.get("month");
  if (m && /^\d{4}-\d{2}$/.test(m)) {
    const [y, mm] = m.split("-").map(Number);
    const start = new Date(Date.UTC(y, mm - 1, 1, 0, 0, 0));
    const end = new Date(Date.UTC(y, mm, 1, 0, 0, 0));
    return { start, end, ym: m };
  }
  // default: bulan ini
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const start = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1, 0, 0, 0));
  const end   = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0));
  return { start, end, ym };
}

function csvEscape(s: string | number | null | undefined) {
  const str = s == null ? "" : String(s);
  // escape " dan bungkus dengan tanda kutip
  const esc = str.replace(/"/g, '""');
  return `"${esc}"`;
}

export async function GET(req: Request) {
  const u = new URL(req.url);
  const { start, end, ym } = parseYM(u);
  const type = u.searchParams.get("type") as TxType | null;
  const accountId = u.searchParams.get("accountId");
  const categoryId = u.searchParams.get("categoryId");

  const where: any = {};
  if (start && end) where.date = { gte: start, lt: end };
  if (type) where.type = type;
  if (accountId) {
    // cocokkan utk transaksi biasa atau transfer yg kena akun tsb
    where.OR = [{ accountId }, { fromAccountId: accountId }, { toAccountId: accountId }];
  }
  if (categoryId) where.categoryId = categoryId;

  const txs = await prisma.transaction.findMany({
    where,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  // ambil nama akun/kategori untuk human readable
  const accIds = new Set<string>();
  const catIds = new Set<string>();
  txs.forEach((t) => {
    if (t.accountId) accIds.add(t.accountId);
    if (t.fromAccountId) accIds.add(t.fromAccountId);
    if (t.toAccountId) accIds.add(t.toAccountId);
    if (t.categoryId) catIds.add(t.categoryId);
  });

  const [accounts, categories] = await Promise.all([
    accIds.size
      ? prisma.account.findMany({ where: { id: { in: Array.from(accIds) } } })
      : Promise.resolve([]),
    catIds.size
      ? prisma.category.findMany({ where: { id: { in: Array.from(catIds) } } })
      : Promise.resolve([]),
  ]);
  const accName = new Map(accounts.map((a) => [a.id, a.name]));
  const catName = new Map(categories.map((c) => [c.id, c.name]));

  const header = [
    "id",
    "date",
    "type",
    "amount",
    "account",
    "category",
    "fromAccount",
    "toAccount",
    "note",
  ].join(",");

  const rows = txs.map((t) => {
    const cols = [
      t.id,
      t.date.toISOString().slice(0, 10),
      t.type,
      t.amount, // simpan tanda +/- apa adanya
      t.accountId ? accName.get(t.accountId) ?? t.accountId : "",
      t.categoryId ? catName.get(t.categoryId) ?? t.categoryId : "",
      t.fromAccountId ? accName.get(t.fromAccountId) ?? t.fromAccountId : "",
      t.toAccountId ? accName.get(t.toAccountId) ?? t.toAccountId : "",
      t.note ?? "",
    ].map(csvEscape);
    return cols.join(",");
  });

  const csv = [header, ...rows].join("\r\n");
  const filename = `transactions-${ym}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
