"use client";

import * as React from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { InputCurrency } from "@/components/input-currency";
import { parseCurrencyToInt, formatIDR } from "@/lib/money";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";

type Account = {
  id: string;
  name: string;
  type: "BANK" | "EWALLET" | "CASH";
  initialBalance: number;
  createdAt: string;
};

type Summary = {
  accounts: { id: string; name: string; type: Account["type"]; initialBalance: number; balance: number }[];
  totals: { totalBalance: number };
  period: string; // "YYYY-MM"
};

const TYPES: Account["type"][] = ["BANK", "EWALLET", "CASH"];

export default function AccountsPage() {
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [list, setList] = React.useState<Account[]>([]);
  const [summary, setSummary] = React.useState<Summary | null>(null);
  const [loading, setLoading] = React.useState(true);

  // form
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<Account["type"]>("BANK");
  const [initial, setInitial] = React.useState("0");

  const balanceMap = new Map(summary?.accounts.map((a) => [a.id, a.balance]) ?? []);

  async function loadAll() {
    setLoading(true);
    try {
      const [aRes, sRes] = await Promise.all([
        fetch("/api/accounts", { cache: "no-store" }),
        fetch(`/api/summary?month=${thisMonth}`, { cache: "no-store" }),
      ]);
      const [a, s] = await Promise.all([aRes.json(), sRes.json()]);
      setList(a);
      setSummary(s);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const initialBalance = parseCurrencyToInt(initial);
    if (!name.trim()) return toast.error("Nama akun wajib diisi");
    if (!Number.isFinite(initialBalance)) return toast.error("Saldo awal tidak valid");

    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), type, initialBalance }),
    });
    const j = await res.json();
    if (!res.ok) return toast.error(j?.error ?? "Gagal menambah akun");
    toast.success("Akun ditambahkan");
    setName("");
    setType("BANK");
    setInitial("0");
    loadAll();
  }

  async function onDelete(id: string) {
    if (!confirm("Hapus akun ini? (Pastikan tidak ada transaksi penting)")) return;
    const res = await fetch(`/api/accounts/${id}`, { method: "DELETE" });
    const j = await res.json();
    if (!res.ok) return toast.error(j?.error ?? "Gagal menghapus");
    toast.success("Akun dihapus");
    loadAll();
  }

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
            <div className="px-4 lg:px-6">
              <h1 className="text-xl font-semibold">Akun</h1>
              <p className="text-sm text-muted-foreground">Kelola rekening bank, e-wallet, dan uang tunai.</p>
            </div>

            <div className="grid gap-4 px-4 lg:grid-cols-3 lg:px-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Tambah Akun</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={onCreate} className="grid gap-4">
                    <div className="grid gap-2">
                      <Label>Nama</Label>
                      <input
                        className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm outline-hidden ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="BCA, OVO, Dompet"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label>Jenis</Label>
                      <Select value={type} onValueChange={(v) => setType(v as Account["type"])}>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih jenis" />
                        </SelectTrigger>
                        <SelectContent>
                          {TYPES.map((t) => (
                            <SelectItem key={t} value={t}>
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label>Saldo Awal (Rp)</Label>
                      <InputCurrency value={initial} onValueChange={setInitial} />
                    </div>

                    <Button type="submit">Simpan</Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Ringkasan</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Jumlah Akun</span>
                    <span className="font-medium">{list.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Saldo</span>
                    <span className="font-medium">
                      {summary ? formatIDR(summary.totals.totalBalance) : "…"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="px-4 lg:px-6">
              <Card>
                <CardHeader>
                  <CardTitle>Daftar Akun</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <p className="text-sm text-muted-foreground">Memuat…</p>
                  ) : list.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Belum ada akun.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="text-left text-muted-foreground">
                          <tr>
                            <th className="py-2">Nama</th>
                            <th>Jenis</th>
                            <th className="text-right">Saldo Awal</th>
                            <th className="text-right">Saldo Saat Ini</th>
                            <th className="text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {list.map((a) => (
                            <tr key={a.id} className="border-t">
                              <td className="py-2">{a.name}</td>
                              <td>{a.type}</td>
                              <td className="text-right">{formatIDR(a.initialBalance)}</td>
                              <td className="text-right font-medium">
                                {balanceMap.has(a.id) ? formatIDR(balanceMap.get(a.id)!) : "—"}
                              </td>
                              <td className="text-right">
                                <Button size="sm" variant="outline" onClick={() => onDelete(a.id)}>
                                  Hapus
                                </Button>
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
