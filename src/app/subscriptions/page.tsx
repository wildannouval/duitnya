"use client";

import * as React from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { InputCurrency } from "@/components/input-currency";
import { formatIDR } from "@/lib/money";
import { toast } from "sonner";

type Account = { id: string; name: string };
type Category = { id: string; name: string; type: "INCOME" | "EXPENSE"; isBudgetable: boolean };

type Sub = {
  id: string;
  name: string;
  amount: number;
  frequency: "WEEKLY" | "MONTHLY" | "YEARLY";
  nextDueDate: string; // ISO
  accountId: string | null;
  isActive: boolean;
  createdAt: string;
};

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

export default function SubscriptionsPage() {
  const [subs, setSubs] = React.useState<Sub[]>([]);
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [loading, setLoading] = React.useState(true);

  // form tambah
  const [name, setName] = React.useState("");
  const [amount, setAmount] = React.useState("0");
  const [frequency, setFrequency] = React.useState<"WEEKLY" | "MONTHLY" | "YEARLY">("MONTHLY");
  const [nextDue, setNextDue] = React.useState(today());
  const [accountId, setAccountId] = React.useState<string>("");
  const [active, setActive] = React.useState(true);

  // form bayar
  const [payCat, setPayCat] = React.useState<string | null>("__NONE__");
  const [payDate, setPayDate] = React.useState(today());

  async function load() {
    setLoading(true);
    try {
      const [sRes, aRes, cRes] = await Promise.all([
        fetch("/api/subscriptions?active=true&days=365", { cache: "no-store" }),
        fetch("/api/accounts", { cache: "no-store" }),
        fetch("/api/categories", { cache: "no-store" }),
      ]);
      const [s, a, c] = await Promise.all([sRes.json(), aRes.json(), cRes.json()]);
      setSubs(s ?? []);
      setAccounts(a ?? []);
      setCategories(c ?? []);
      if (!accountId && (a?.length ?? 0) > 0) setAccountId(a[0].id);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const amt = Math.round(Math.abs(Number(amount || "0")));
    if (!name.trim()) return toast.error("Nama wajib diisi");
    if (!Number.isFinite(amt) || amt <= 0) return toast.error("Nominal harus > 0");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(nextDue)) return toast.error("Tanggal due harus YYYY-MM-DD");

    const res = await fetch("/api/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        amount: amt,
        frequency,
        nextDueDate: nextDue,
        accountId: accountId || null,
        isActive: active,
      }),
    });
    const j = await res.json();
    if (!res.ok) return toast.error(j?.error ?? "Gagal membuat langganan");

    toast.success("Langganan ditambahkan");
    setName("");
    setAmount("0");
    setNextDue(today());
    load();
  }

  async function toggleActive(sub: Sub, v: boolean) {
    const res = await fetch(`/api/subscriptions/${sub.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: v }),
    });
    const j = await res.json();
    if (!res.ok) return toast.error(j?.error ?? "Gagal mengubah status");
    setSubs((p) => p.map((s) => (s.id === sub.id ? j : s)));
  }

  async function deleteSub(sub: Sub) {
    if (!confirm(`Hapus langganan "${sub.name}"?`)) return;
    const res = await fetch(`/api/subscriptions/${sub.id}`, { method: "DELETE" });
    const j = await res.json();
    if (!res.ok) return toast.error(j?.error ?? "Gagal menghapus");
    setSubs((p) => p.filter((s) => s.id !== sub.id));
    toast.success("Dihapus");
  }

  async function payNow(sub: Sub) {
    const categoryId = payCat && payCat !== "__NONE__" ? payCat : undefined;
    const res = await fetch(`/api/subscriptions/${sub.id}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: payDate,
        accountId: sub.accountId || accountId || undefined,
        categoryId,
        note: `Pembayaran langganan: ${sub.name}`,
      }),
    });
    const j = await res.json();
    if (!res.ok) return toast.error(j?.error ?? "Gagal bayar");
    toast.success("Dibayar & due berikutnya dimajukan");
    // refresh
    load();
  }

  const expenseCats = categories.filter((c) => c.type === "EXPENSE");

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
              <h1 className="text-xl font-semibold">Langganan</h1>
              <p className="text-sm text-muted-foreground">
                Kelola biaya berulang (WEEKLY / MONTHLY / YEARLY) dan catat pembayaran.
              </p>
            </div>

            {/* Form tambah */}
            <div className="grid gap-4 px-4 lg:grid-cols-3 lg:px-6">
              <Card className="lg:col-span-2">
                <CardHeader><CardTitle>Tambah Langganan</CardTitle></CardHeader>
                <CardContent>
                  <form className="grid gap-4" onSubmit={onCreate}>
                    <div className="grid gap-1">
                      <Label>Nama</Label>
                      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Spotify, Netflix, Internet..." />
                    </div>

                    <div className="grid gap-1">
                      <Label>Nominal (Rp)</Label>
                      <InputCurrency value={amount} onValueChange={setAmount} />
                    </div>

                    <div className="grid gap-1">
                      <Label>Frekuensi</Label>
                      <Select value={frequency} onValueChange={(v) => setFrequency(v as any)}>
                        <SelectTrigger><SelectValue placeholder="Pilih frekuensi" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="WEEKLY">WEEKLY</SelectItem>
                          <SelectItem value="MONTHLY">MONTHLY</SelectItem>
                          <SelectItem value="YEARLY">YEARLY</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-1">
                      <Label>Jatuh Tempo Berikutnya</Label>
                      <Input type="date" value={nextDue} onChange={(e) => setNextDue(e.target.value)} />
                    </div>

                    <div className="grid gap-1">
                      <Label>Akun default (opsional)</Label>
                      <Select value={accountId} onValueChange={setAccountId}>
                        <SelectTrigger><SelectValue placeholder="Pilih akun" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__NONE__" disabled>Pilih akun…</SelectItem>
                          {accounts.map((a) => (
                            <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <label className="inline-flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
                      Aktif
                    </label>

                    <Button type="submit">Simpan</Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Bayar Cepat</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-1">
                    <Label>Tanggal</Label>
                    <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
                  </div>
                  <div className="grid gap-1">
                    <Label>Kategori (opsional)</Label>
                    <Select
                      value={payCat ?? "__NONE__"}
                      onValueChange={(v) => setPayCat(v === "__NONE__" ? null : v)}
                    >
                      <SelectTrigger><SelectValue placeholder="(Tanpa kategori)" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__NONE__">(Tanpa kategori)</SelectItem>
                        {expenseCats.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    “Bayar” pada list akan menggunakan tanggal & kategori ini. Akun dipakai dari subscription (kalau ada), kalau tidak ada akan pakai pilihan akun saat membuat subscription.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* List */}
            <div className="px-4 lg:px-6">
              <Card>
                <CardHeader><CardTitle>Daftar Langganan</CardTitle></CardHeader>
                <CardContent>
                  {loading ? (
                    <p className="text-sm text-muted-foreground">Memuat…</p>
                  ) : subs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Belum ada langganan.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="text-left text-muted-foreground">
                          <tr>
                            <th className="py-2">Nama</th>
                            <th>Freq</th>
                            <th>Due</th>
                            <th>Akun</th>
                            <th className="text-right">Nominal</th>
                            <th className="text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {subs
                            .slice()
                            .sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime())
                            .map((s) => {
                              const due = new Date(s.nextDueDate);
                              const overdue = due.getTime() < new Date().setHours(0,0,0,0);
                              return (
                                <tr key={s.id} className="border-t">
                                  <td className="py-2">
                                    <div className="font-medium">{s.name}</div>
                                    <div className="text-xs text-muted-foreground">{s.isActive ? "Aktif" : "Nonaktif"}</div>
                                  </td>
                                  <td>{s.frequency}</td>
                                  <td className={overdue ? "text-red-600" : ""}>
                                    {due.toLocaleDateString()}
                                  </td>
                                  <td>{s.accountId ?? "-"}</td>
                                  <td className="text-right">{formatIDR(s.amount)}</td>
                                  <td className="text-right">
                                    <div className="flex justify-end gap-2">
                                      <Button size="sm" variant="outline" onClick={() => toggleActive(s, !s.isActive)}>
                                        {s.isActive ? "Pause" : "Resume"}
                                      </Button>
                                      <Button size="sm" onClick={() => payNow(s)}>Bayar</Button>
                                      <Button size="sm" variant="destructive" onClick={() => deleteSub(s)}>Hapus</Button>
                                    </div>
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
