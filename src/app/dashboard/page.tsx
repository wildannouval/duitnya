"use client";

import * as React from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type AccountRow = {
  id: string;
  name: string;
  type: "BANK" | "EWALLET" | "CASH";
  initialBalance: number;
  balance: number;
};
type Summary = {
  period: string; // "YYYY-MM"
  totals: { totalBalance: number; incomeMonth: number; expenseMonth: number; netMonth: number };
  accounts: AccountRow[];
};

type Upcoming = {
  generatedAt: string;
  days: number;
  subscriptions: {
    kind: "SUBSCRIPTION";
    id: string;
    name: string;
    amount: number;
    dueDate: string;
    daysTo: number;
    overdue: boolean;
    accountName: string | null;
  }[];
  debts: {
    kind: "DEBT";
    id: string;
    type: "HUTANG" | "PIUTANG";
    counterpartyName: string;
    remainingAmount: number;
    dueDate: string;
    daysTo: number;
    overdue: boolean;
  }[];
};

export default function DashboardPage() {
  const [data, setData] = React.useState<Summary | null>(null);
  const [upcoming, setUpcoming] = React.useState<Upcoming | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadingUpcoming, setLoadingUpcoming] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fmt = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/summary", { cache: "no-store" });
        const j = await res.json();
        setData(j);
      } catch {
        setError("Gagal memuat ringkasan.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/upcoming?days=7", { cache: "no-store" });
        const j = await res.json();
        setUpcoming(j);
      } catch {
        // biarkan tanpa error UI, hanya tidak menampilkan widget
      } finally {
        setLoadingUpcoming(false);
      }
    })();
  }, []);

  const badge = (daysTo: number) => {
    if (daysTo < 0) return <span className="text-xs text-red-600">Lewat {Math.abs(daysTo)}h</span>;
    if (daysTo === 0) return <span className="text-xs text-orange-600">Hari ini</span>;
    return <span className="text-xs text-muted-foreground">Dlm {daysTo}h</span>;
  };

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
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              {/* Kartu Ringkasan */}
              <div className="grid gap-4 px-4 lg:grid-cols-4 lg:px-6">
                <Card>
                  <CardHeader><CardTitle>Total Saldo</CardTitle></CardHeader>
                  <CardContent className="text-2xl font-semibold">
                    {loading ? "…" : data ? fmt(data.totals.totalBalance) : "-"}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>Income Bulan Ini</CardTitle></CardHeader>
                  <CardContent className="text-2xl font-semibold">
                    {loading ? "…" : data ? fmt(data.totals.incomeMonth) : "-"}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>Expense Bulan Ini</CardTitle></CardHeader>
                  <CardContent className="text-2xl font-semibold">
                    {loading ? "…" : data ? fmt(data.totals.expenseMonth) : "-"}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>Net Bulan Ini</CardTitle></CardHeader>
                  <CardContent className="text-2xl font-semibold">
                    {loading ? "…" : data ? fmt(data.totals.netMonth) : "-"}
                  </CardContent>
                </Card>
              </div>

              {/* Pengingat 7 Hari */}
              <div className="grid gap-4 px-4 lg:grid-cols-2 lg:px-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Langganan (7 hari)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingUpcoming ? (
                      <p className="text-sm text-muted-foreground">Memuat…</p>
                    ) : !upcoming || upcoming.subscriptions.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Tidak ada langganan jatuh tempo.</p>
                    ) : (
                      <ul className="divide-y">
                        {upcoming.subscriptions.map((s) => (
                          <li key={s.id} className="py-3 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-medium truncate">{s.name}</div>
                              <div className="text-xs text-muted-foreground flex gap-2">
                                <span>{fmt(s.amount)}</span>
                                <span>•</span>
                                <span>Due {s.dueDate.slice(0,10)}</span>
                                <span>•</span>
                                {badge(s.daysTo)}
                              </div>
                            </div>
                            <div className="shrink-0 flex gap-2">
                              <Button size="sm" variant="outline" asChild>
                                <a href="/subscriptions">Kelola</a>
                              </Button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Hutang–Piutang (7 hari)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingUpcoming ? (
                      <p className="text-sm text-muted-foreground">Memuat…</p>
                    ) : !upcoming || upcoming.debts.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Tidak ada hutang/piutang jatuh tempo.</p>
                    ) : (
                      <ul className="divide-y">
                        {upcoming.debts.map((d) => (
                          <li key={d.id} className="py-3 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-medium truncate">
                                {d.type === "HUTANG" ? "Hutang ke " : "Piutang dari "}
                                {d.counterpartyName}
                              </div>
                              <div className="text-xs text-muted-foreground flex gap-2">
                                <span>Sisa {fmt(d.remainingAmount)}</span>
                                <span>•</span>
                                <span>Due {d.dueDate.slice(0,10)}</span>
                                <span>•</span>
                                {badge(d.daysTo)}
                              </div>
                            </div>
                            <div className="shrink-0 flex gap-2">
                              <Button size="sm" variant="outline" asChild>
                                <a href="/debts">Kelola</a>
                              </Button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Tabel Saldo per Akun */}
              <div className="px-4 lg:px-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Saldo per Akun {data ? `(${data.period})` : ""}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <p className="text-sm text-muted-foreground">Memuat…</p>
                    ) : error ? (
                      <p className="text-sm text-red-600">{error}</p>
                    ) : !data || data.accounts.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Belum ada akun.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="text-left text-muted-foreground">
                            <tr>
                              <th className="py-2">Akun</th>
                              <th>Jenis</th>
                              <th className="text-right">Saldo Awal</th>
                              <th className="text-right">Perubahan</th>
                              <th className="text-right">Saldo Akhir</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.accounts.map((a) => {
                              const delta = a.balance - a.initialBalance;
                              return (
                                <tr key={a.id} className="border-t">
                                  <td className="py-2">{a.name}</td>
                                  <td>{a.type}</td>
                                  <td className="text-right">{fmt(a.initialBalance)}</td>
                                  <td className="text-right">{fmt(delta)}</td>
                                  <td className="text-right font-medium">{fmt(a.balance)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
