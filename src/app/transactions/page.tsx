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
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { QuickCreate } from "@/components/quick-create";

type Tx = {
  id: string;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  amount: number;
  date: string;
  note?: string | null;
  accountId?: string | null;
  categoryId?: string | null;
  fromAccountId?: string | null;
  toAccountId?: string | null;
  transferGroupId?: string | null;
};

type Account = { id: string; name: string };
type Category = { id: string; name: string; type: "INCOME" | "EXPENSE" };

const ALL = "__all__"; // sentinel utk "Semua …"

export default function TransactionsPage() {
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [month, setMonth] = React.useState(thisMonth);
  const [type, setType] = React.useState<"ALL" | "INCOME" | "EXPENSE" | "TRANSFER">("ALL");
  const [accountId, setAccountId] = React.useState<string>(ALL);
  const [categoryId, setCategoryId] = React.useState<string>(ALL);

  const [txs, setTxs] = React.useState<Tx[]>([]);
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [openQC, setOpenQC] = React.useState(false);

  const fmt = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

  async function loadAll() {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (month) qs.set("month", month);
      if (type !== "ALL") qs.set("type", type);
      if (accountId !== ALL) qs.set("accountId", accountId);
      if (categoryId !== ALL) qs.set("categoryId", categoryId);

      const [tRes, aRes, cRes] = await Promise.all([
        fetch(`/api/transactions?${qs.toString()}`, { cache: "no-store" }),
        fetch(`/api/accounts`, { cache: "no-store" }),
        fetch(`/api/categories`, { cache: "no-store" }),
      ]);
      const [t, a, c] = await Promise.all([tRes.json(), aRes.json(), cRes.json()]);
      setTxs(t);
      setAccounts(a);
      setCategories(c);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { loadAll(); /* eslint-disable-line */ }, [month, type, accountId, categoryId]);

  async function onDelete(id: string) {
    const ok = confirm("Hapus transaksi ini? (Jika transfer, pasangan akan ikut terhapus)");
    if (!ok) return;
    const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    const j = await res.json();
    if (!res.ok) {
      alert(j?.error ?? "Gagal menghapus.");
      return;
    }
    loadAll();
  }

  const exportHref = React.useMemo(() => {
  const qs = new URLSearchParams();
  if (month) qs.set("month", month);
  if (type !== "ALL") qs.set("type", type);
  if (accountId !== "__all__") qs.set("accountId", accountId);
  if (categoryId !== "__all__") qs.set("categoryId", categoryId);
  return `/api/exports/transactions?${qs.toString()}`;
}, [month, type, accountId, categoryId]);


  return (
    <SidebarProvider style={{ "--sidebar-width": "calc(var(--spacing) * 72)", "--header-height": "calc(var(--spacing) * 12)" } as React.CSSProperties}>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col @container/main">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">

            {/* Header + filters */}
            <div className="px-4 lg:px-6 flex items-end justify-between gap-3">
              <div>
                <h1 className="text-xl font-semibold">Transaksi</h1>
                <p className="text-sm text-muted-foreground">Lihat & kelola transaksi per bulan.</p>
              </div>
              <div className="flex gap-2">
  <Button asChild variant="outline">
    <a href={exportHref} target="_blank" rel="noopener noreferrer">Export CSV</a>
  </Button>
  <Button onClick={() => setOpenQC(true)}>Quick Create</Button>
</div>

            </div>

            <div className="grid gap-4 px-4 lg:grid-cols-4 lg:px-6">
              <div className="grid gap-2">
                <Label>Bulan</Label>
                <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Jenis</Label>
                <Select value={type} onValueChange={(v) => setType(v as any)}>
                  <SelectTrigger><SelectValue placeholder="Semua jenis" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">ALL</SelectItem>
                    <SelectItem value="INCOME">INCOME</SelectItem>
                    <SelectItem value="EXPENSE">EXPENSE</SelectItem>
                    <SelectItem value="TRANSFER">TRANSFER</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Akun</Label>
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger><SelectValue placeholder="Semua akun" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Semua akun</SelectItem>
                    {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Kategori</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger><SelectValue placeholder="Semua kategori" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Semua kategori</SelectItem>
                    {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* List */}
            <div className="px-4 lg:px-6">
              <Card>
                <CardHeader><CardTitle>Daftar Transaksi</CardTitle></CardHeader>
                <CardContent>
                  {loading ? (
                    <p className="text-sm text-muted-foreground">Memuat…</p>
                  ) : txs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Belum ada transaksi.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="text-left text-muted-foreground">
                          <tr>
                            <th className="py-2">Tanggal</th>
                            <th>Jenis</th>
                            <th>Detail</th>
                            <th className="text-right">Nominal</th>
                            <th className="text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {txs.map((t) => (
                            <tr key={t.id} className="border-top">
                              <td className="py-2">{t.date.slice(0,10)}</td>
                              <td>{t.type}</td>
                              <td className="max-w-[420px]">
                                <div className="truncate">
                                  {t.type === "TRANSFER" ? (
                                    t.amount < 0
                                      ? <>Transfer keluar (from: {t.fromAccountId})</>
                                      : <>Transfer masuk (to: {t.toAccountId})</>
                                  ) : (
                                    <>
                                      {t.note ?? "—"}
                                      {t.categoryId ? <span className="text-xs text-muted-foreground"> · cat:{t.categoryId}</span> : null}
                                      {t.accountId ? <span className="text-xs text-muted-foreground"> · acc:{t.accountId}</span> : null}
                                    </>
                                  )}
                                </div>
                              </td>
                              <td className={`text-right ${t.amount < 0 ? "text-red-600" : "text-green-600"} font-medium`}>
                                {fmt(Math.abs(t.amount))}
                              </td>
                              <td className="text-right">
                                <Button size="sm" variant="outline" onClick={() => onDelete(t.id)}>Hapus</Button>
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

      {/* Quick Create dialog */}
      <QuickCreate open={openQC} onOpenChange={setOpenQC} onCreated={() => loadAll()} />
    </SidebarProvider>
  );
}
