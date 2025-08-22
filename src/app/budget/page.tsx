"use client";

import * as React from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";

type Category = { id: string; name: string; type: "INCOME" | "EXPENSE"; isBudgetable: boolean };
type BudgetItemView = {
  id: string;
  categoryId: string;
  categoryName: string;
  planned: number;
  spent: number;
  remaining: number;
  percent: number; // 0..100
};
type Summary = {
  month: string; // YYYY-MM
  items: BudgetItemView[];
  totals: { planned: number; spent: number; remaining: number };
};

export default function BudgetPage() {
  const thisMonth = React.useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }, []);
  const [month, setMonth] = React.useState(thisMonth);

  const [categories, setCategories] = React.useState<Category[]>([]);
  const [summary, setSummary] = React.useState<Summary | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  // form add/update item
  const [categoryId, setCategoryId] = React.useState("");
  const [amountPlanned, setAmountPlanned] = React.useState("0");

  const fmt = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

  async function loadData(m: string) {
    setLoading(true);
    setError(null);
    try {
      const [catRes, sumRes] = await Promise.all([
        fetch("/api/categories", { cache: "no-store" }),
        fetch(`/api/budget/summary?month=${m}`, { cache: "no-store" }),
      ]);
      const [cats, sum] = await Promise.all([catRes.json(), sumRes.json()]);
      setCategories(cats);
      setSummary(sum);
    } catch {
      setError("Gagal memuat budget.");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { loadData(month); }, [month]);

  const expenseCats = categories.filter((c: Category) => c.type === "EXPENSE" && c.isBudgetable);
  const alreadyUsed = new Set(summary?.items.map((i) => i.categoryId) ?? []);
  const availableCats = expenseCats.filter((c) => !alreadyUsed.has(c.id));

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amt = Number(amountPlanned.replace(/[^\d-]/g, ""));
    if (!categoryId) return setError("Pilih kategori.");
    if (!Number.isFinite(amt) || amt <= 0) return setError("Nominal harus > 0.");

    setSubmitting(true);
    try {
      const res = await fetch("/api/budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, categoryId, amountPlanned: amt }),
      });
      const created = await res.json();
      if (!res.ok) return setError(created?.error ?? "Gagal menyimpan budget.");

      // refresh summary
      await loadData(month);
      setCategoryId("");
      setAmountPlanned("0");
    } catch {
      setError("Gagal menyimpan budget.");
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(itemId: string) {
    const ok = confirm("Hapus item budget ini?");
    if (!ok) return;
    try {
      const res = await fetch(`/api/budget/items/${itemId}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json();
        alert(j?.error ?? "Gagal menghapus");
        return;
      }
      await loadData(month);
    } catch {
      alert("Gagal menghapus");
    }
  }

  return (
    <SidebarProvider style={{ "--sidebar-width": "calc(var(--spacing) * 72)", "--header-height": "calc(var(--spacing) * 12)" } as React.CSSProperties}>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col @container/main">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">

            {/* Header & month picker */}
            <div className="px-4 lg:px-6 flex items-end justify-between gap-4">
              <div>
                <h1 className="text-xl font-semibold">Budget</h1>
                <p className="text-sm text-muted-foreground">Atur anggaran kategori untuk bulan tertentu.</p>
              </div>
              <div className="grid gap-2">
                <Label>Bulan</Label>
                <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
              </div>
            </div>

            {/* Ringkasan total */}
            <div className="grid gap-4 px-4 lg:grid-cols-3 lg:px-6">
              <Card>
                <CardHeader><CardTitle>Total Planned</CardTitle></CardHeader>
                <CardContent className="text-2xl font-semibold">
                  {loading ? "…" : summary ? fmt(summary.totals.planned) : "-"}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Spent</CardTitle></CardHeader>
                <CardContent className="text-2xl font-semibold">
                  {loading ? "…" : summary ? fmt(summary.totals.spent) : "-"}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Remaining</CardTitle></CardHeader>
                <CardContent className="text-2xl font-semibold">
                  {loading ? "…" : summary ? fmt(summary.totals.remaining) : "-"}
                </CardContent>
              </Card>
            </div>

            {/* Form tambah/ubah item budget */}
            <div className="grid gap-4 px-4 lg:grid-cols-3 lg:px-6">
              <Card className="lg:col-span-2">
                <CardHeader><CardTitle>Tambah / Ubah Item Budget</CardTitle></CardHeader>
                <CardContent>
                  <form onSubmit={onAdd} className="grid gap-4">
                    <div className="grid gap-2">
                      <Label>Kategori</Label>
                      <Select value={categoryId} onValueChange={setCategoryId}>
                        <SelectTrigger><SelectValue placeholder="Pilih kategori (EXPENSE)" /></SelectTrigger>
                        <SelectContent>
                          {availableCats.length === 0 ? (
                            <div className="px-2 py-1.5 text-sm text-muted-foreground">Semua kategori sudah di-budget.</div>
                          ) : (
                            availableCats.map((c) => (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Hanya kategori <b>EXPENSE</b> & budgetable yang ditampilkan.
                      </p>
                    </div>

                    <div className="grid gap-2">
                      <Label>Nominal (Rp)</Label>
                      <Input inputMode="numeric" value={amountPlanned} onChange={(e) => setAmountPlanned(e.target.value)} />
                    </div>

                    {error && <p className="text-sm text-red-600">{error}</p>}

                    <Button type="submit" disabled={submitting}>
                      {submitting ? "Menyimpan..." : "Simpan"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Info</CardTitle></CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>Progress = pengeluaran bulan ini per kategori dibanding target (planned).</p>
                  <p>Ganti bulan untuk melihat/menyetel budget periode lain.</p>
                </CardContent>
              </Card>
            </div>

            {/* Tabel progress per kategori */}
            <div className="px-4 lg:px-6">
              <Card>
                <CardHeader><CardTitle>Progress per Kategori</CardTitle></CardHeader>
                <CardContent>
                  {loading ? (
                    <p className="text-sm text-muted-foreground">Memuat…</p>
                  ) : !summary || summary.items.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Belum ada item budget untuk bulan ini.</p>
                  ) : (
                    <div className="space-y-4">
                      {summary.items.map((it) => (
                        <div key={it.id} className="grid gap-1">
                          <div className="flex items-center justify-between text-sm">
                            <div className="font-medium">{it.categoryName}</div>
                            <div className="text-muted-foreground">
                              {fmt(it.spent)} / {fmt(it.planned)} ({it.percent}%)
                            </div>
                          </div>
                          <Progress value={it.percent} />
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Remaining: {fmt(it.remaining)}</span>
                            <Button size="sm" variant="outline" onClick={() => onDelete(it.id)}>
                              Hapus
                            </Button>
                          </div>
                        </div>
                      ))}
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
