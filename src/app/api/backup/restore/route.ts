import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Mode = "merge" | "replace";

// helper
const toDate = (s: any) => (s ? new Date(String(s)) : null);
const toInt = (n: any) => (Number.isFinite(Number(n)) ? Math.round(Number(n)) : 0);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const mode: Mode = (body?.mode === "replace" ? "replace" : "merge");
    const data = body?.data;
    if (!data || typeof data !== "object") {
      return NextResponse.json({ error: "data tidak valid" }, { status: 400 });
    }

    const {
      accounts = [],
      categories = [],
      transactions = [],
      debts = [],
      debtPayments = [],
      subscriptions = [],
      budgets = [],
    } = data as any;

    const result = await prisma.$transaction(async (tx) => {
      if (mode === "replace") {
        await tx.debtPayment.deleteMany({});
        await tx.transaction.deleteMany({});
        await tx.subscription.deleteMany({});
        await tx.budget.deleteMany({});
        await tx.debt.deleteMany({});
        await tx.category.deleteMany({});
        await tx.account.deleteMany({});
      }

      // 1) Accounts
      for (const a of accounts) {
        await tx.account.upsert({
          where: { id: String(a.id) },
          update: {
            name: String(a.name),
            type: String(a.type) as any,
            currency: String(a.currency ?? "IDR"),
            initialBalance: toInt(a.initialBalance ?? 0),
          },
          create: {
            id: String(a.id),
            name: String(a.name),
            type: String(a.type) as any,
            currency: String(a.currency ?? "IDR"),
            initialBalance: toInt(a.initialBalance ?? 0),
            createdAt: toDate(a.createdAt) ?? undefined,
          },
        });
      }

      // 2) Categories
      for (const c of categories) {
        await tx.category.upsert({
          where: { id: String(c.id) },
          update: {
            name: String(c.name),
            type: String(c.type) as any,
            isBudgetable: Boolean(c.isBudgetable ?? (String(c.type) === "EXPENSE")),
          },
          create: {
            id: String(c.id),
            name: String(c.name),
            type: String(c.type) as any,
            isBudgetable: Boolean(c.isBudgetable ?? (String(c.type) === "EXPENSE")),
            createdAt: toDate(c.createdAt) ?? undefined,
          },
        });
      }

      // 3) Debts
      for (const d of debts) {
        await tx.debt.upsert({
          where: { id: String(d.id) },
          update: {
            kind: String(d.kind) as any,
            counterpartyName: String(d.counterpartyName),
            principalAmount: toInt(d.principalAmount),
            remainingAmount: toInt(d.remainingAmount),
            dueDate: toDate(d.dueDate),
            status: String(d.status) as any,
          },
          create: {
            id: String(d.id),
            kind: String(d.kind) as any,
            counterpartyName: String(d.counterpartyName),
            principalAmount: toInt(d.principalAmount),
            remainingAmount: toInt(d.remainingAmount),
            dueDate: toDate(d.dueDate),
            status: String(d.status) as any,
            createdAt: toDate(d.createdAt) ?? undefined,
          },
        });
      }

      // 4) Subscriptions
      for (const s of subscriptions) {
        await tx.subscription.upsert({
          where: { id: String(s.id) },
          update: {
            name: String(s.name),
            amount: toInt(s.amount),
            frequency: String(s.frequency) as any,
            nextDueDate: toDate(s.nextDueDate) ?? new Date(),
            accountId: s.accountId ? String(s.accountId) : null,
            isActive: Boolean(s.isActive ?? true),
          },
          create: {
            id: String(s.id),
            name: String(s.name),
            amount: toInt(s.amount),
            frequency: String(s.frequency) as any,
            nextDueDate: toDate(s.nextDueDate) ?? new Date(),
            accountId: s.accountId ? String(s.accountId) : null,
            isActive: Boolean(s.isActive ?? true),
            createdAt: toDate(s.createdAt) ?? undefined,
          },
        });
      }

      // 5) Budgets
      for (const b of budgets) {
        await tx.budget.upsert({
          where: { id: String(b.id) },
          update: {
            month: String(b.month),
            categoryId: String(b.categoryId),
            amount: toInt(b.amount),
          },
          create: {
            id: String(b.id),
            month: String(b.month),
            categoryId: String(b.categoryId),
            amount: toInt(b.amount),
            createdAt: toDate(b.createdAt) ?? undefined,
          },
        });
      }

      // 6) Transactions
      for (const t of transactions) {
        await tx.transaction.upsert({
          where: { id: String(t.id) },
          update: {
            type: String(t.type) as any,
            amount: toInt(t.amount),
            date: toDate(t.date) ?? new Date(),
            accountId: t.accountId ? String(t.accountId) : null,
            categoryId: t.categoryId ? String(t.categoryId) : null,
            fromAccountId: t.fromAccountId ? String(t.fromAccountId) : null,
            toAccountId: t.toAccountId ? String(t.toAccountId) : null,
            transferGroupId: t.transferGroupId ? String(t.transferGroupId) : null,
            note: t.note ? String(t.note) : null,
          },
          create: {
            id: String(t.id),
            type: String(t.type) as any,
            amount: toInt(t.amount),
            date: toDate(t.date) ?? new Date(),
            accountId: t.accountId ? String(t.accountId) : null,
            categoryId: t.categoryId ? String(t.categoryId) : null,
            fromAccountId: t.fromAccountId ? String(t.fromAccountId) : null,
            toAccountId: t.toAccountId ? String(t.toAccountId) : null,
            transferGroupId: t.transferGroupId ? String(t.transferGroupId) : null,
            note: t.note ? String(t.note) : null,
            createdAt: toDate(t.createdAt) ?? undefined,
          },
        });
      }

      // 7) DebtPayments — FIX: tidak set createdAt (model tidak punya)
      for (const p of debtPayments) {
        await tx.debtPayment.upsert({
          where: { id: String(p.id) },
          update: {
            debtId: String(p.debtId),
            amount: toInt(p.amount),
            date: toDate(p.date) ?? new Date(),
            accountId: p.accountId ? String(p.accountId) : null,
            transactionId: p.transactionId ? String(p.transactionId) : null,
          },
          create: {
            id: String(p.id),
            debtId: String(p.debtId),
            amount: toInt(p.amount),
            date: toDate(p.date) ?? new Date(),
            accountId: p.accountId ? String(p.accountId) : null,
            transactionId: p.transactionId ? String(p.transactionId) : null,
            // createdAt: (hapus) — tidak ada di model
          },
        });
      }

      return { ok: true };
    });

    return NextResponse.json({ ...result, mode });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Bad request" }, { status: 400 });
  }
}
