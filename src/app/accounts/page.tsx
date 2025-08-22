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

type AccountType = "BANK" | "EWALLET" | "CASH";
type Account = {
  id: string;
  name: string;
  type: AccountType;
  initialBalance: number;
  createdAt: string;
};

export default function AccountsPage() {
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // form
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<AccountType>("BANK");
  const [initialBalance, setInitialBalance] = React.useState("0");

  const fmt = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

  // load data dari API
  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/accounts", { cache: "no-store" });
        const data = await res.json();
        setAccounts(data);
      } catch {
        setError("Gagal memuat data akun.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amt = Number(initialBalance.replace(/[^\d-]/g, ""));
    if (!name.trim()) return setError("Nama akun wajib diisi.");
    if (!Number.isFinite(amt) || amt < 0) return setError("Saldo awal harus angka ≥ 0.");

    setSubmitting(true);
    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), type, initialBalance: amt }),
      });
      const created = await res.json();
      if (!res.ok) return setError(created?.error ?? "Gagal menambah akun.");

      setAccounts((prev) => [created, ...prev]);
      setName(""); setType("BANK"); setInitialBalance("0");
    } catch {
      setError("Gagal menambah akun.");
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(id: string) {
    const ok = confirm("Hapus akun ini?");
    if (!ok) return;
    try {
      const res = await fetch(`/api/accounts/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json();
        alert(j?.error ?? "Gagal menghapus");
        return;
      }
      setAccounts((prev) => prev.filter((a) => a.id !== id));
    } catch {
      alert("Gagal menghapus");
    }
  }

  const total = accounts.reduce((s, a) => s + a.initialBalance, 0);

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
                <CardHeader><CardTitle>Tambah Akun</CardTitle></CardHeader>
                <CardContent>
                  <form onSubmit={onAdd} className="grid gap-4">
                    <div className="grid gap-2">
                      <Label>Nama Akun</Label>
                      <Input placeholder="Mis. BCA, GoPay, Dompet" value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div className="grid gap-2">
                      <Label>Jenis</Label>
                      <Select value={type} onValueChange={(v) => setType(v as AccountType)}>
                        <SelectTrigger><SelectValue placeholder="Pilih jenis" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BANK">BANK</SelectItem>
                          <SelectItem value="EWALLET">EWALLET</SelectItem>
                          <SelectItem value="CASH">CASH</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Saldo Awal (Rp)</Label>
                      <Input inputMode="numeric" value={initialBalance} onChange={(e) => setInitialBalance(e.target.value)} />
                      <p className="text-xs text-muted-foreground">Contoh 150000 untuk Rp150.000</p>
                    </div>
                    {error && <p className="text-sm text-red-600">{error}</p>}
                    <Button type="submit" disabled={submitting}>
                      {submitting ? "Menyimpan..." : "Tambah Akun"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Ringkasan */}
              <Card>
                <CardHeader><CardTitle>Ringkasan</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between"><span>Jumlah Akun</span><span className="font-medium">{accounts.length}</span></div>
                  <div className="flex justify-between"><span>Total Saldo Awal</span><span className="font-medium">{fmt(total)}</span></div>
                </CardContent>
              </Card>
            </div>

            {/* Daftar */}
            <div className="px-4 lg:px-6">
              <Card>
                <CardHeader><CardTitle>Daftar Akun</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {loading ? (
                    <p className="text-sm text-muted-foreground">Memuat…</p>
                  ) : accounts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Belum ada akun.</p>
                  ) : (
                    <ul className="divide-y">
                      {accounts.map((a) => (
                        <li key={a.id} className="flex items-center justify-between py-3">
                          <div>
                            <div className="font-medium">{a.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {a.type} • {fmt(a.initialBalance)}
                            </div>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => onDelete(a.id)}>
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
