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
import { toast } from "sonner";

type Category = {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
  isBudgetable: boolean;
  createdAt: string;
};

export default function CategoriesPage() {
  const [list, setList] = React.useState<Category[]>([]);
  const [loading, setLoading] = React.useState(true);

  // form
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [budgetable, setBudgetable] = React.useState<"YA" | "TIDAK">("YA");

  async function loadAll() {
    setLoading(true);
    try {
      const res = await fetch("/api/categories", { cache: "no-store" });
      const j = await res.json();
      setList(j);
    } finally {
      setLoading(false);
    }
  }
  React.useEffect(() => { loadAll(); }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error("Nama kategori wajib diisi");
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        type,
        isBudgetable: budgetable === "YA",
      }),
    });
    const j = await res.json();
    if (!res.ok) return toast.error(j?.error ?? "Gagal menambah kategori");
    toast.success("Kategori ditambahkan");
    setName(""); setType("EXPENSE"); setBudgetable("YA");
    loadAll();
  }

  async function onToggleBudgetable(cat: Category) {
    const res = await fetch(`/api/categories/${cat.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isBudgetable: !cat.isBudgetable }),
    });
    const j = await res.json();
    if (!res.ok) return toast.error(j?.error ?? "Gagal update");
    setList(prev => prev.map(c => c.id === cat.id ? j : c));
    toast.success("Diupdate");
  }

  async function onDelete(id: string) {
    if (!confirm("Hapus kategori ini? (pastikan tidak dipakai transaksi)")) return;
    const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
    const j = await res.json();
    if (!res.ok) return toast.error(j?.error ?? "Gagal menghapus");
    toast.success("Kategori dihapus");
    setList(prev => prev.filter(c => c.id !== id));
  }

  return (
    <SidebarProvider style={{ "--sidebar-width": "calc(var(--spacing) * 72)", "--header-height": "calc(var(--spacing) * 12)" } as React.CSSProperties}>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col @container/main">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="px-4 lg:px-6"><h1 className="text-xl font-semibold">Kategori</h1></div>

            <div className="grid gap-4 px-4 lg:grid-cols-3 lg:px-6">
              <Card className="lg:col-span-2">
                <CardHeader><CardTitle>Tambah Kategori</CardTitle></CardHeader>
                <CardContent>
                  <form onSubmit={onCreate} className="grid gap-4">
                    <div className="grid gap-2">
                      <Label>Nama</Label>
                      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Makan, Gaji, Listrik" />
                    </div>
                    <div className="grid gap-2">
                      <Label>Jenis</Label>
                      <Select value={type} onValueChange={(v) => setType(v as any)}>
                        <SelectTrigger><SelectValue placeholder="Pilih jenis" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="INCOME">INCOME</SelectItem>
                          <SelectItem value="EXPENSE">EXPENSE</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Ikut Budget?</Label>
                      <Select value={budgetable} onValueChange={(v) => setBudgetable(v as "YA"|"TIDAK")}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="YA">YA</SelectItem>
                          <SelectItem value="TIDAK">TIDAK</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">Biasanya hanya kategori EXPENSE yang di-budget.</p>
                    </div>
                    <Button type="submit">Simpan</Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Info</CardTitle></CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>Kategori <b>INCOME</b> tidak muncul di Budget.</p>
                  <p>Kamu bisa toggle “Ikut Budget” untuk kategori EXPENSE.</p>
                </CardContent>
              </Card>
            </div>

            <div className="px-4 lg:px-6">
              <Card>
                <CardHeader><CardTitle>Daftar Kategori</CardTitle></CardHeader>
                <CardContent>
                  {loading ? <p className="text-sm text-muted-foreground">Memuat…</p> : list.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Belum ada kategori.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="text-left text-muted-foreground">
                          <tr>
                            <th className="py-2">Nama</th>
                            <th>Jenis</th>
                            <th>Ikut Budget</th>
                            <th className="text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {list.map(c => (
                            <tr key={c.id} className="border-t">
                              <td className="py-2">{c.name}</td>
                              <td>{c.type}</td>
                              <td>
                                <Button size="sm" variant="outline" onClick={() => onToggleBudgetable(c)}>
                                  {c.isBudgetable ? "YA" : "TIDAK"}
                                </Button>
                              </td>
                              <td className="text-right">
                                <Button size="sm" variant="outline" onClick={() => onDelete(c.id)}>Hapus</Button>
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
