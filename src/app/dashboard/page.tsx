"use client";

import * as React from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { formatIDR } from "@/lib/money";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { toast } from "sonner";

type Account = { id: string; name: string };
type Category = { id: string; name: string; type: "INCOME" | "EXPENSE"; isBudgetable: boolean };

type Summary = {
  month: string;
  totalIncome: number;
  totalExpense: number;
  net: number;
  daily: { date: string; income: number; expense: number; net: number }[];
  categories: { categoryId: string | null; name: string; expense: number }[];
};

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function DashboardPage() {
  const [month, setMonth] = React.useState(currentMonth());
  const [accountId, setAccountId] = React.useState<string>("__ALL__");
  const [categoryId, setCategoryId] = React.useState<string>("__ALL__");

  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [data, setData] = React.useState<Summary | null>(null);
  const [loading, setLoading] = React.useState(true);

  async function loadFilters() {
    try {
      const [aRes, cRes] = await Promise.all([
        fetch("/api/accounts", { cache: "no-store" }),
        fetch("/api/categories", { cache: "no-store" }),
      ]);
      const [a, c] = await Promise.all([aRes.json(), cRes.json()]);
      setAccounts(a ?? []);
      setCategories(c ?? []);
    } catch {
      // ignore
    }
  }

  async function loadSummary() {
    setLoading(true);
    try {
      const p = new URLSearchParams({ month });
      if (accountId && accountId !== "__ALL__") p.set("accountId", accountId);
      if (categoryId && categoryId !== "__ALL__") p.set("categoryId", categoryId);
      const res = await fetch(`/api/dashboard/summary?${p.toString()}`, { cache: "no-store" });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error ?? "Gagal memuat ringkasan");
      setData(j);
    } catch (e: any) {
      toast.error(e?.message ?? "Gagal memuat ringkasan");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    loadFilters();
  }, []);
  React.useEffect(() => {
    loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, accountId, categoryId]);

  const totalIncome = data?.totalIncome ?? 0;
  const totalExpense = data?.totalExpense ?? 0;
  const net = data?.net ?? 0;

  // warna pie — biar kontras, tapi tetap aman kalau jumlah kategori sedikit
  const pieColors = ["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#8dd1e1", "#a4de6c", "#d0ed57", "#a28bfd", "#ffb3ba", "#bae1ff"];

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

            {/* Filters */}
            <div className="px-4 lg:px-6">
              <Card>
                <CardHeader><CardTitle>Filter</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid gap-3 md:grid-cols-4">
                    <div className="grid gap-1">
                      <Label>Bulan</Label>
                      <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
                    </div>

                    <div className="grid gap-1">
                      <Label>Akun</Label>
                      <Select value={accountId} onValueChange={setAccountId}>
                        <SelectTrigger><SelectValue placeholder="Semua akun" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__ALL__">Semua akun</SelectItem>
                          {accounts.map((a) => (
                            <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-1">
                      <Label>Kategori</Label>
                      <Select value={categoryId} onValueChange={setCategoryId}>
                        <SelectTrigger><SelectValue placeholder="Semua kategori" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__ALL__">Semua kategori</SelectItem>
                          {categories
                            .filter((c) => c.type !== "INCOME") // biasanya breakdown pakai EXPENSE; kalau mau tampilkan income, hapus filter ini
                            .map((c) => (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-end">
                      <Button variant="outline" onClick={() => { setAccountId("__ALL__"); setCategoryId("__ALL__"); }}>
                        Reset
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Summary cards */}
            <div className="grid gap-4 px-4 lg:grid-cols-3 lg:px-6">
              <Card>
                <CardHeader className="pb-2"><CardTitle>Pemasukan</CardTitle></CardHeader>
                <CardContent className="text-2xl font-semibold">
                  {formatIDR(totalIncome)}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle>Pengeluaran</CardTitle></CardHeader>
                <CardContent className="text-2xl font-semibold">
                  {formatIDR(totalExpense)}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle>Saldo Bersih</CardTitle></CardHeader>
                <CardContent className={`text-2xl font-semibold ${net < 0 ? "text-red-600" : ""}`}>
                  {formatIDR(net)}
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid gap-4 px-4 lg:grid-cols-3 lg:px-6">
              {/* Area Chart Harian */}
              <Card className="lg:col-span-2">
                <CardHeader><CardTitle>Tren Harian (bulan {data?.month ?? month})</CardTitle></CardHeader>
                <CardContent className="h-[320px]">
                  {loading ? (
                    <p className="text-sm text-muted-foreground">Memuat grafik…</p>
                  ) : (data?.daily?.length ?? 0) === 0 ? (
                    <p className="text-sm text-muted-foreground">Tidak ada data.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data!.daily}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip
                          formatter={(val: any, name) =>
                            name === "income" || name === "expense" || name === "net"
                              ? formatIDR(Number(val))
                              : val
                          }
                        />
                        <Legend />
                        <Area type="monotone" dataKey="income" name="Income" fillOpacity={0.3} />
                        <Area type="monotone" dataKey="expense" name="Expense" fillOpacity={0.3} />
                        <Area type="monotone" dataKey="net" name="Net" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Pie Chart Kategori (Expense) */}
              <Card>
                <CardHeader><CardTitle>Pengeluaran per Kategori</CardTitle></CardHeader>
                <CardContent className="h-[320px]">
                  {loading ? (
                    <p className="text-sm text-muted-foreground">Memuat grafik…</p>
                  ) : (data?.categories?.length ?? 0) === 0 ? (
                    <p className="text-sm text-muted-foreground">Tidak ada data.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data!.categories}
                          dataKey="expense"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({ name, expense }) => `${name} (${Math.round(expense / (data!.totalExpense || 1) * 100)}%)`}
                        >
                          {data!.categories.map((_, i) => (
                            <Cell key={i} fill={pieColors[i % pieColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(val: any) => formatIDR(Number(val))} />
                      </PieChart>
                    </ResponsiveContainer>
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
