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

type Freq = "WEEKLY" | "MONTHLY" | "YEARLY";
type Account = { id: string; name: string };
type SubRow = {
  id: string;
  name: string;
  amount: number;
  frequency: Freq;
  nextDueDate: string;
  isActive: boolean;
  account?: Account | null;
  accountId?: string | null;
};

// sentinel untuk opsi kosong akun (Select tidak boleh value="")
const NONE = "__none__";

export default function SubscriptionsPage() {
  const [subs, setSubs] = React.useState<SubRow[]>([]);
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  // form create
  const [name, setName] = React.useState("");
  const [amount, setAmount] = React.useState("0");
  const [frequency, setFrequency] = React.useState<Freq>("MONTHLY");
  const [nextDue, setNextDue] = React.useState<string>(() =>
    new Date().toISOString().slice(0,10)
  );
  const [accountId, setAccountId] = React.useState<string>("");

  const fmt = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

  async function loadAll() {
    setLoading(true);
    try {
      const [aRes, sRes] = await Promise.all([
        fetch("/api/accounts", { cache: "no-store" }),
        fetch("/api/subscriptions", { cache: "no-store" }),
      ]);
      const [a, s] = await Promise.all([aRes.json(), sRes.json()]);
      setAccounts(a);
      setSubs(s);
    } catch {
      setError("Gagal memuat langganan.");
    } finally {
      setLoading(false);
    }
  }
  React.useEffect(() => { loadAll(); }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amt = Number(amount.replace(/[^\d-]/g, ""));
    if (!name.trim()) return setError("Nama wajib diisi.");
    if (!Number.isFinite(amt) || amt <= 0) return setError("Nominal harus > 0.");

    setSubmitting(true);
    try {
      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          amount: amt,
          frequency,
          nextDueDate: nextDue,
          accountId: accountId || undefined,
          isActive: true,
        }),
      });
      const created = await res.json();
      if (!res.ok) return setError(created?.error ?? "Gagal menambah langganan.");

      setSubs((prev) => [created, ...prev]);
      setName(""); setAmount("0"); setFrequency("MONTHLY");
      setNextDue(new Date().toISOString().slice(0,10));
      setAccountId("");
    } catch {
      setError("Gagal menambah langganan.");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(s: SubRow) {
    const res = await fetch(`/api/subscriptions/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !s.isActive }),
    });
    const updated = await res.json();
    if (!res.ok) return alert(updated?.error ?? "Gagal update status.");
    setSubs((prev) => prev.map(x => x.id === s.id ? updated : x));
  }

  async function updateAccount(s: SubRow, newAccountId: string) {
    const body: any = { accountId: newAccountId === NONE ? "" : newAccountId };
    const res = await fetch(`/api/subscriptions/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const updated = await res.json();
    if (!res.ok) return alert(updated?.error ?? "Gagal set akun.");
    setSubs((prev) => prev.map(x => x.id === s.id ? updated : x));
  }

  async function onDelete(id: string) {
    const ok = confirm("Hapus langganan ini?");
    if (!ok) return;
    const res = await fetch(`/api/subscriptions/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const j = await res.json();
      alert(j?.error ?? "Gagal menghapus.");
      return;
    }
    setSubs((prev) => prev.filter((x) => x.id !== id));
  }

  async function charge(s: SubRow, opt?: { accountId?: string; amount?: number; date?: string }) {
    const res = await fetch(`/api/subscriptions/${s.id}/charge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(opt ?? {}),
    });
    const j = await res.json();
    if (!res.ok) {
      alert(j?.error ?? "Gagal charge.");
      return;
    }
    // majunya nextDueDate sudah dilakukan server → refresh list
    await loadAll();
    alert("Berhasil dicatat sebagai transaksi.");
  }

  const daysTo = (s: SubRow) => {
    const due = new Date(s.nextDueDate);
    const today = new Date();
    return Math.ceil((+due - +today) / (1000*60*60*24));
  };
  const dueBadge = (s: SubRow) => {
    const d = daysTo(s);
    const label = s.nextDueDate.slice(0,10);
    if (d < 0) return <span className="text-xs text-red-600">Lewat {Math.abs(d)}h · {label}</span>;
    if (d === 0) return <span className="text-xs text-orange-600">Hari ini · {label}</span>;
    return <span className="text-xs text-muted-foreground">Dlm {d}h · {label}</span>;
  };

  return (
    <SidebarProvider style={{ "--sidebar-width": "calc(var(--spacing) * 72)", "--header-height": "calc(var(--spacing) * 12)" } as React.CSSProperties}>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />

        <div className="flex flex-1 flex-col @container/main">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">

            {/* Form create */}
            <div className="grid gap-4 px-4 lg:grid-cols-3 lg:px-6">
              <Card className="lg:col-span-2">
                <CardHeader><CardTitle>Tambah Langganan</CardTitle></CardHeader>
                <CardContent>
                  <form onSubmit={onCreate} className="grid gap-4">
                    <div className="grid gap-2">
                      <Label>Nama</Label>
                      <Input placeholder="Netflix, Internet, dll." value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div className="grid gap-2">
                      <Label>Nominal (Rp)</Label>
                      <Input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} />
                    </div>
                    <div className="grid gap-2">
                      <Label>Frekuensi</Label>
                      <Select value={frequency} onValueChange={(v) => setFrequency(v as Freq)}>
                        <SelectTrigger><SelectValue placeholder="Pilih frekuensi" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="WEEKLY">WEEKLY</SelectItem>
                          <SelectItem value="MONTHLY">MONTHLY</SelectItem>
                          <SelectItem value="YEARLY">YEARLY</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Jatuh Tempo Berikutnya</Label>
                      <Input type="date" value={nextDue} onChange={(e) => setNextDue(e.target.value)} />
                    </div>
                    <div className="grid gap-2">
                      <Label>Akun Default (opsional)</Label>
                      <Select value={accountId || NONE} onValueChange={(v) => setAccountId(v === NONE ? "" : v)}>
                        <SelectTrigger><SelectValue placeholder="Pilih akun (opsional)" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>—</SelectItem>
                          {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">Bila diisi, saat “Charge” otomatis pakai akun ini.</p>
                    </div>
                    {error && <p className="text-sm text-red-600">{error}</p>}
                    <Button type="submit" disabled={submitting}>{submitting ? "Menyimpan..." : "Simpan"}</Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Info</CardTitle></CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>“Charge now” akan membuat transaksi <b>EXPENSE</b> dan memajukan tanggal jatuh tempo otomatis.</p>
                  <p>Akun default opsional—kalau kosong, saat charge kamu harus memilih akun.</p>
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
                            <th>Nominal</th>
                            <th>Frekuensi</th>
                            <th>Jatuh Tempo</th>
                            <th>Akun</th>
                            <th>Status</th>
                            <th className="text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {subs.map((s) => (
                            <tr key={s.id} className="border-t">
                              <td className="py-2 font-medium">{s.name}</td>
                              <td>{fmt(s.amount)}</td>
                              <td>{s.frequency}</td>
                              <td>{dueBadge(s)}</td>
                              <td className="max-w-[220px]">
                                <Select
                                  value={s.accountId || NONE}
                                  onValueChange={(v) => updateAccount(s, v)}
                                >
                                  <SelectTrigger><SelectValue placeholder="Pilih akun (opsional)" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value={NONE}>—</SelectItem>
                                    {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </td>
                              <td>{s.isActive ? "ACTIVE" : "PAUSED"}</td>
                              <td className="text-right space-x-2">
                                <Button size="sm" onClick={() => {
                                  if (s.accountId) {
                                    charge(s);
                                  } else {
                                    const chosen = prompt("Masukkan accountId (atau kosongkan untuk batal):\n" + accounts.map(a => `${a.name} → ${a.id}`).join("\n"));
                                    if (!chosen) return;
                                    charge(s, { accountId: chosen });
                                  }
                                }}>
                                  Charge now
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => toggleActive(s)}>
                                  {s.isActive ? "Pause" : "Resume"}
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => onDelete(s.id)}>
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
