"use client";

import * as React from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";

type CategoryType = "INCOME" | "EXPENSE";
type Category = {
  id: string;
  name: string;
  type: CategoryType;
  isBudgetable: boolean;
  createdAt: string;
};

export default function CategoriesPage() {
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // form
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<CategoryType>("EXPENSE");
  const [isBudgetable, setIsBudgetable] = React.useState(true);

  // load data
  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/categories", { cache: "no-store" });
        const data = await res.json();
        setCategories(data);
      } catch {
        setError("Gagal memuat kategori.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Nama kategori wajib diisi.");

    setSubmitting(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          type,
          isBudgetable,
        }),
      });
      const created = await res.json();
      if (!res.ok) return setError(created?.error ?? "Gagal menambah kategori.");

      setCategories((prev) => [created, ...prev]);
      setName(""); setType("EXPENSE"); setIsBudgetable(true);
    } catch {
      setError("Gagal menambah kategori.");
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(id: string) {
    const ok = confirm("Hapus kategori ini?");
    if (!ok) return;
    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json();
        alert(j?.error ?? "Gagal menghapus");
        return;
      }
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch {
      alert("Gagal menghapus");
    }
  }

  const incomeCount = categories.filter((c) => c.type === "INCOME").length;
  const expenseCount = categories.filter((c) => c.type === "EXPENSE").length;

  return (
    <SidebarProvider style={{ "--sidebar-width": "calc(var(--spacing) * 72)", "--header-height": "calc(var(--spacing) * 12)" } as React.CSSProperties}>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col @container/main">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="grid gap-4 px-4 lg:grid-cols-3 lg:px-6">
              {/* Form */}
              <Card className="lg:col-span-2">
                <CardHeader><CardTitle>Tambah Kategori</CardTitle></CardHeader>
                <CardContent>
                  <form onSubmit={onAdd} className="grid gap-4">
                    <div className="grid gap-2">
                      <Label>Nama Kategori</Label>
                      <Input placeholder="Makan, Transport, Gaji, dll." value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div className="grid gap-2">
                      <Label>Jenis</Label>
                      <Select value={type} onValueChange={(v) => setType(v as CategoryType)}>
                        <SelectTrigger><SelectValue placeholder="Pilih jenis" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="INCOME">INCOME</SelectItem>
                          <SelectItem value="EXPENSE">EXPENSE</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <input
                        id="budgetable"
                        type="checkbox"
                        checked={isBudgetable}
                        onChange={(e) => setIsBudgetable(e.target.checked)}
                      />
                      <Label htmlFor="budgetable">Masuk perhitungan budget</Label>
                    </div>
                    {error && <p className="text-sm text-red-600">{error}</p>}
                    <Button type="submit" disabled={submitting}>
                      {submitting ? "Menyimpan..." : "Tambah Kategori"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Ringkasan */}
              <Card>
                <CardHeader><CardTitle>Ringkasan</CardTitle></CardHeader>
                <CardContent className="text-sm space-y-2">
                  <div className="flex justify-between"><span>Income</span><span className="font-medium">{incomeCount}</span></div>
                  <div className="flex justify-between"><span>Expense</span><span className="font-medium">{expenseCount}</span></div>
                </CardContent>
              </Card>
            </div>

            {/* List */}
            <div className="px-4 lg:px-6">
              <Card>
                <CardHeader><CardTitle>Daftar Kategori</CardTitle></CardHeader>
                <CardContent>
                  {loading ? (
                    <p className="text-sm text-muted-foreground">Memuat…</p>
                  ) : categories.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Belum ada kategori.</p>
                  ) : (
                    <ul className="divide-y">
                      {categories.map((c) => (
                        <li key={c.id} className="flex items-center justify-between py-3">
                          <div>
                            <div className="font-medium">{c.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {c.type} {c.isBudgetable ? "• budgetable" : ""}
                            </div>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => onDelete(c.id)}>
                            Hapus
                          </Button>
                        </li>
                      ))}
                    </ul>
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
