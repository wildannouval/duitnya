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
import { InputCurrency } from "@/components/input-currency";
import { formatIDR, parseCurrencyToInt } from "@/lib/money";
import { toast } from "sonner";

type Category = { id: string; name: string; type: "INCOME" | "EXPENSE"; isBudgetable: boolean };
type BudgetRow = {
  id: string;
  month: string;
  categoryId: string;
  amount: number;
  createdAt: string;
  category: Category;
  spent: number; // dari API
};

export default function BudgetPage() {
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;

  const [month, setMonth] = React.useState(thisMonth);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [budgets, setBudgets] = React.useState<BudgetRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  // form tambah
  const [catAdd, setCatAdd] = React.useState<string>("");
  const [amtAdd, setAmtAdd] = React.useState<string>("0");

  const budgetableCats = categories.filter(c => c.type === "EXPENSE" && c.isBudgetable);
  const nonBudgetedCats = budgetableCats.filter(c => !budgets.some(b => b.categoryId === c.id));

  async function loadAll() {
    setLoading(true);
    try {
      const [cRes, bRes] = await Promise.all([
        fetch("/api/categories", { cache: "no-store" }),
        fetch(`/api/budgets?month=${month}`, { cache: "no-store" }),
      ]);
      const [c, b] = await Promise.all([cRes.json(), bRes.json()]);
      setCategories(c);
      setBudgets(b.items);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, [month]);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!catAdd) return toast.error("Pilih kategori");
    const amount = parseCurrencyToInt(amtAdd);
    if (amount <= 0) return toast.error("Nominal harus > 0");

    const res = await fetch("/api/budgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month, categoryId: catAdd, amount }),
    });
    const j = await res.json();
    if (!res.ok) return toast.error(j?.error ?? "Gagal menambah budget");
    toast.success("Budget ditambahkan/diupdate");
    setCatAdd("");
    setAmtAdd("0");
    loadAll();
  }

  async function onUpdateAmount(b: BudgetRow, newStr: string) {
    const amount = parseCurrencyToInt(newStr);
    if (amount <= 0) return toast.error("Nominal harus > 0");
    const res = await fetch(`/api/budgets/${b.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    });
    const j = await res.json();
    if (!res.ok) return toast.error(j?.error ?? "Gagal update");
    toast.success("Budget diupdate");
    setBudgets(prev => prev.map(x => x.id === b.id ? { ...x, amount } : x));
  }

  async function onDelete(id: string) {
    if (!confirm("Hapus budget ini?")) return;
    const res = await fetch(`/api/budgets/${id}`, { method: "DELETE" });
    const j = await res.json();
    if (!res.ok) return toast.error(j?.error ?? "Gagal menghapus");
    toast.success("Budget dihapus");
    setBudgets(prev => prev.filter(x => x.id !== id));
  }

  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);

  return (
    <SidebarProvider style={{ "--sidebar-width": "calc(var(--spacing) * 72)", "--header-height": "calc(var(--spacing) * 12)" } as React.CSSProperties}>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col @container/main">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">

            {/* Header & bulan */}
            <div className="px-4 lg:px-6 flex items-end justify-between gap-3">
              <div>
                <h1 className="text-xl font-semibold">Budget Bulanan</h1>
                <p className="text-sm text-muted-foreground">Atur target pengeluaran per kategori untuk bulan berjalan.</p>
              </div>
              <div className="grid gap-1">
                <Label>Bulan</Label>
                <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
              </div>
            </div>

            {/* Ringkasan */}
            <div className="grid gap-4 px-4 lg:grid-cols-2 lg:px-6">
              <Card>
                <CardHeader><CardTitle>Total Budget</CardTitle></CardHeader>
                <CardContent className="text-2xl font-semibold">{formatIDR(totalBudget)}</CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Total Spent</CardTitle></CardHeader>
                <CardContent className="text-2xl font-semibold">{formatIDR(totalSpent)}</CardContent>
              </Card>
            </div>

            {/* Form tambah */}
            <div className="grid gap-4 px-4 lg:grid-cols-3 lg:px-6">
              <Card className="lg:col-span-2">
                <CardHeader><CardTitle>Tambah / Ubah Budget</CardTitle></CardHeader>
                <CardContent>
                  <form onSubmit={onAdd} className="grid gap-4 md:grid-cols-3">
                    <div className="grid gap-2">
                      <Label>Kategori (EXPENSE)</Label>
                      <Select value={catAdd} onValueChange={setCatAdd}>
                        <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                        <SelectContent>
                          {nonBudgetedCats.length === 0 ? (
                            <div className="px-2 py-1.5 text-sm text-muted-foreground">Semua kategori sudah ada budget. Kamu tetap bisa update di tabel.</div>
                          ) : nonBudgetedCats.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Nominal (Rp)</Label>
                      <InputCurrency value={amtAdd} onValueChange={setAmtAdd} />
                    </div>
                    <div className="flex items-end">
                      <Button type="submit">Simpan</Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Tips</CardTitle></CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>Budget hanya untuk kategori <b>EXPENSE</b> yang ditandai <i>Ikut Budget</i> di halaman Kategori.</p>
                  <p>Kamu bisa klik angka budget di tabel untuk mengubah cepat.</p>
                </CardContent>
              </Card>
            </div>

            {/* Tabel budget */}
            <div className="px-4 lg:px-6">
              <Card>
                <CardHeader><CardTitle>Daftar Budget {month}</CardTitle></CardHeader>
                <CardContent>
                  {loading ? (
                    <p className="text-sm text-muted-foreground">Memuat…</p>
                  ) : budgets.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Belum ada budget untuk bulan ini.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="text-left text-muted-foreground">
                          <tr>
                            <th className="py-2">Kategori</th>
                            <th className="text-right">Budget</th>
                            <th className="text-right">Spent</th>
                            <th className="text-right">Sisa</th>
                            <th>Progress</th>
                            <th className="text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {budgets.map((b) => {
                            const remaining = b.amount - b.spent;
                            const ratio = b.amount > 0 ? Math.min(1, b.spent / b.amount) : 0;
                            return (
                              <tr key={b.id} className="border-t align-middle">
                                <td className="py-2">{b.category.name}</td>

                                {/* Edit inline budget */}
                                <td className="text-right">
                                  <InlineMoney
                                    value={b.amount}
                                    onSave={(newVal) => onUpdateAmount(b, String(newVal))}
                                  />
                                </td>

                                <td className="text-right">{formatIDR(b.spent)}</td>
                                <td className={`text-right ${remaining < 0 ? "text-red-600" : ""}`}>
                                  {formatIDR(remaining)}
                                </td>
                                <td className="w-[220px]">
                                  <div className="h-2 w-full rounded bg-muted overflow-hidden">
                                    <div
                                      className={`h-full ${remaining < 0 ? "bg-red-500" : "bg-primary"}`}
                                      style={{ width: `${ratio * 100}%` }}
                                    />
                                  </div>
                                </td>
                                <td className="text-right">
                                  <Button size="sm" variant="outline" onClick={() => onDelete(b.id)}>Hapus</Button>
                                </td>
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
      </SidebarInset>
    </SidebarProvider>
  );
}

/** Editor angka sederhana untuk kolom Budget (klik -> edit -> Enter/blur untuk simpan) */
function InlineMoney({ value, onSave }: { value: number; onSave: (newVal: number) => void }) {
  const [editing, setEditing] = React.useState(false);
  const [val, setVal] = React.useState(String(value));

  React.useEffect(() => { setVal(String(value)); }, [value]);

  if (!editing) {
    return (
      <button className="underline-offset-2 hover:underline" onClick={() => setEditing(true)}>
        {formatIDR(value)}
      </button>
    );
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const n = parseCurrencyToInt(val);
        if (n > 0) onSave(n);
        setEditing(false);
      }}
      onBlur={() => {
        const n = parseCurrencyToInt(val);
        if (n > 0) onSave(n);
        setEditing(false);
      }}
    >
      <InputCurrency value={val} onValueChange={setVal} />
    </form>
  );
}
