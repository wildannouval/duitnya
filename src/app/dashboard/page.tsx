"use client";

import * as React from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatIDR } from "@/lib/money";

type TxType = "INCOME" | "EXPENSE" | "TRANSFER";
type Tx = {
  id: string;
  type: TxType;
  amount: number;
  date: string;      // ISO
  note?: string | null;
  accountId?: string | null;
  categoryId?: string | null;
  fromAccountId?: string | null;
  toAccountId?: string | null;
};

type Summary = {
  period: string; // "YYYY-MM"
  totals: { totalBalance: number };
  accounts: { id: string; name: string; balance: number }[];
};

type BudgetRow = {
  id: string;
  month: string;
  categoryId: string;
  amount: number; // rencana
  spent: number;  // dari API budgets
  createdAt: string;
  category: { id: string; name: string };
};

type SubRow = {
  id: string;
  name: string;
  amount: number;
  frequency: "WEEKLY" | "MONTHLY" | "YEARLY";
  nextDueDate: string; // ISO
  isActive: boolean;
};

type DebtRow = {
  id: string;
  kind: "HUTANG" | "PIUTANG";
  counterpartyName: string;
  remainingAmount: number;
  dueDate?: string | null;
  status: "OPEN" | "PAID";
};

export default function DashboardPage() {
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [summary, setSummary] = React.useState<Summary | null>(null);
  const [txs, setTxs] = React.useState<Tx[]>([]);
  const [budgets, setBudgets] = React.useState<BudgetRow[]>([]);
  const [subs, setSubs] = React.useState<SubRow[]>([]);
  const [debts, setDebts] = React.useState<DebtRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [sumRes, txRes, budRes, subRes, debtRes] = await Promise.all([
          fetch(`/api/summary?month=${ym}`, { cache: "no-store" }),
          fetch(`/api/transactions?month=${ym}`, { cache: "no-store" }),
          fetch(`/api/budgets?month=${ym}`, { cache: "no-store" }),
          fetch(`/api/subscriptions`, { cache: "no-store" }),
          fetch(`/api/debts`, { cache: "no-store" }),
        ]);

        const [sum, tx, bud, s, d] = await Promise.all([
          sumRes.ok ? sumRes.json() : Promise.resolve(null),
          txRes.ok ? txRes.json() : Promise.resolve([]),
          budRes.ok ? budRes.json() : Promise.resolve({ items: [] }),
          subRes.ok ? subRes.json() : Promise.resolve([]),
          debtRes.ok ? debtRes.json() : Promise.resolve([]),
        ]);

        setSummary(sum);
        setTxs(tx);
        setBudgets(bud?.items ?? []);
        setSubs(s);
        setDebts(d);
      } finally {
        setLoading(false);
      }
    })();
  }, [ym]);

  // ==== KPI bulanan ====
  const incomeThisMonth = txs
    .filter((t) => t.type === "INCOME")
    .reduce((s, t) => s + Math.max(0, t.amount), 0);

  const expenseThisMonth = txs
    .filter((t) => t.type === "EXPENSE")
    .reduce((s, t) => s + Math.abs(Math.min(0, t.amount)), 0);

  const budgetPlanned = budgets.reduce((s, b) => s + b.amount, 0);
  const budgetSpent   = budgets.reduce((s, b) => s + b.spent, 0);
  const budgetPct     = budgetPlanned > 0 ? Math.min(100, Math.round((budgetSpent / budgetPlanned) * 100)) : 0;

  // ==== Upcoming 7 hari ====
  function within7Days(dateISO?: string | null) {
    if (!dateISO) return false;
    const d = new Date(dateISO);
    const today = new Date();
    const diff = Math.ceil((+d - +today) / 86_400_000);
    return diff >= 0 && diff <= 7;
  }
  const upcomingSubs = subs.filter((s) => s.isActive && within7Days(s.nextDueDate)).length;
  const upcomingDebts = debts.filter((d) => d.status === "OPEN" && within7Days(d.dueDate ?? undefined)).length;

  // ==== 10 transaksi terbaru bulan ini ====
  const recent = [...txs]
    .sort((a, b) => {
      // sort desc by date, fallback createdAt (tidak tersedia di tipe Tx — asumsi date cukup)
      return b.date.localeCompare(a.date);
    })
    .slice(0, 10);

  const fmt = (n: number) => formatIDR(n);

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />

        <div className="flex flex-1 flex-col @container/main">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">

            {/* Header */}
            <div className="px-4 lg:px-6 flex items-end justify-between gap-3">
              <div>
                <h1 className="text-xl font-semibold">Dashboard</h1>
                <p className="text-sm text-muted-foreground">Ringkasan bulan {ym}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button asChild variant="outline">
                  <a
                    href={`/api/exports/transactions?month=${ym}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Export CSV
                  </a>
                </Button>
              </div>
            </div>

            {/* KPI cards */}
            <div className="grid gap-4 px-4 lg:grid-cols-4 lg:px-6">
              <KpiCard title="Total Saldo" value={summary ? fmt(summary.totals.totalBalance) : "…"} />
              <KpiCard title="Income (bulan ini)" value={fmt(incomeThisMonth)} accent="green" />
              <KpiCard title="Expense (bulan ini)" value={fmt(expenseThisMonth)} accent="red" />
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Budget (terpakai)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <div className="text-2xl font-semibold">{fmt(budgetSpent)}</div>
                    <div className="text-sm text-muted-foreground">dari {fmt(budgetPlanned)}</div>
                  </div>
                  <div className="h-2 w-full rounded bg-muted overflow-hidden">
                    <div
                      className={`h-full ${budgetPct >= 100 ? "bg-red-500" : "bg-primary"}`}
                      style={{ width: `${budgetPct}%` }}
                    />
                  </div>
                  <div className={`text-xs ${budgetPct >= 100 ? "text-red-600" : "text-muted-foreground"}`}>
                    {budgetPct}% {budgetPct >= 100 ? "(overspent)" : ""}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Upcoming */}
            <div className="grid gap-4 px-4 lg:grid-cols-2 lg:px-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Jatuh Tempo 7 Hari (Subscriptions)</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-semibold">
                  {loading ? "…" : upcomingSubs}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Jatuh Tempo 7 Hari (Debts)</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-semibold">
                  {loading ? "…" : upcomingDebts}
                </CardContent>
              </Card>
            </div>

            {/* Recent transactions */}
            <div className="px-4 lg:px-6">
              <Card>
                <CardHeader>
                  <CardTitle>Transaksi Terbaru</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <p className="text-sm text-muted-foreground">Memuat…</p>
                  ) : recent.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Belum ada transaksi bulan ini.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="text-left text-muted-foreground">
                          <tr>
                            <th className="py-2">Tanggal</th>
                            <th>Jenis</th>
                            <th>Detail</th>
                            <th className="text-right">Nominal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recent.map((t) => (
                            <tr key={t.id} className="border-t">
                              <td className="py-2">{t.date.slice(0, 10)}</td>
                              <td>{t.type}</td>
                              <td className="max-w-[420px]">
                                <div className="truncate">
                                  {t.type === "TRANSFER"
                                    ? t.amount < 0
                                      ? "Transfer keluar"
                                      : "Transfer masuk"
                                    : t.note ?? "—"}
                                </div>
                              </td>
                              <td
                                className={`text-right font-medium ${
                                  t.amount < 0 ? "text-red-600" : "text-green-600"
                                }`}
                              >
                                {formatIDR(Math.abs(t.amount))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function KpiCard({
  title,
  value,
  accent,
}: {
  title: string;
  value: string;
  accent?: "red" | "green";
}) {
  const bar = accent === "red" ? "bg-red-500/20" : accent === "green" ? "bg-green-500/20" : "bg-primary/20";
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-2xl font-semibold">{value}</div>
        <div className={`h-1.5 w-12 rounded ${bar}`} />
      </CardContent>
    </Card>
  );
}
