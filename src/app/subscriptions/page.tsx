"use client";

import * as React from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { InputCurrency } from "@/components/input-currency";
import { parseCurrencyToInt, formatIDR } from "@/lib/money";
import { toast } from "sonner";
import { ChargeSubscriptionDialog, type SubRow } from "@/components/charge-subscription-dialog";

type Freq = "WEEKLY" | "MONTHLY" | "YEARLY";
type Account = { id: string; name: string };
type Row = SubRow & { account?: Account | null };

const NONE = "__none__";

export default function SubscriptionsPage() {
  const [subs, setSubs] = React.useState<Row[]>([]);
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [creating, setCreating] = React.useState(false);

  // form create
  const [name, setName] = React.useState("");
  const [amount, setAmount] = React.useState("0");
  const [frequency, setFrequency] = React.useState<Freq>("MONTHLY");
  const [nextDue, setNextDue] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [accountId, setAccountId] = React.useState("");

  // dialog charge
  const [openCharge, setOpenCharge] = React.useState(false);
  const [activeSub, setActiveSub] = React.useState<Row | null>(null);

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
    } finally {
      setLoading(false);
    }
  }
  React.useEffect(() => { loadAll(); }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseCurrencyToInt(amount);
    if (!name.trim()) return toast.error("Nama wajib");
    if (amt <= 0) return toast.error("Nominal harus > 0");

    setCreating(true);
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
      const j = await res.json();
      if (!res.ok) return toast.error(j?.error ?? "Gagal menambah");
      toast.success("Langganan ditambahkan");
      setSubs((p) => [j, ...p]);
      setName(""); setAmount("0"); setFrequency("MONTHLY");
      setNextDue(new Date().toISOString().slice(0, 10));
      setAccountId("");
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(s: Row) {
    const res = await fetch(`/api/subscriptions/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !s.isActive }),
    });
    const j = await res.json();
    if (!res.ok) return toast.error(j?.error ?? "Gagal update");
    setSubs((prev) => prev.map((x) => (x.id === s.id ? j : x)));
    toast.success("Status diperbarui");
  }

  async function updateAccount(s: Row, newAccountId: string) {
    const body: any = { accountId: newAccountId === NONE ? "" : newAccountId };
    const res = await fetch(`/api/subscriptions/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await res.json();
    if (!res.ok) return toast.error(j?.error ?? "Gagal set akun");
    setSubs((prev) => prev.map((x) => (x.id === s.id ? j : x)));
    toast.success("Akun default diupdate");
  }

  async function onDelete(id: string) {
    if (!confirm("Hapus langganan ini?")) return;
    const res = await fetch(`/api/subscriptions/${id}`, { method: "DELETE" });
    const j = await res.json();
    if (!res.ok) return toast.error(j?.error ?? "Gagal menghapus");
    setSubs((prev) => prev.filter((x) => x.id !== id));
    toast.success("Langganan dihapus");
  }

  const daysTo = (s: Row) => {
    const due = new Date(s.nextDueDate);
    const today = new Date();
    return Math.ceil((+due - +today) / 86_400_000);
  };
  const dueBadge = (s: Row) => {
    const d = daysTo(s);
    const label = s.nextDueDate.slice(0, 10);
    if (d < 0) return <span className="text-xs text-red-600">Lewat {Math.abs(d)}h · {label}</span>;
    if (d === 0) return <span className="text-xs text-orange-600">Hari ini · {label}</span>;
    return <span className="text-xs text-muted-foreground">Dlm {d}h · {label}</span>;
  };
  const fmt = (n: number) => formatIDR(n);

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
                      <InputCurrency value={amount} onValueChange={setAmount} />
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
                          {accounts.map((a) => (
                            <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">Jika diisi, “Charge” otomatis pakai akun ini.</p>
                    </div>
                    <Button type="submit" disabled={creating}>{creating ? "Menyimpan…" : "Simpan"}</Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Info</CardTitle></CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>“Charge now” membuat transaksi <b>EXPENSE</b> dan memajukan tanggal due.</p>
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
                                <Select value={s.accountId || NONE} onValueChange={(v) => updateAccount(s, v)}>
                                  <SelectTrigger><SelectValue placeholder="Pilih akun (opsional)" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value={NONE}>—</SelectItem>
                                    {accounts.map((a) => (
                                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </td>
                              <td>{s.isActive ? "ACTIVE" : "PAUSED"}</td>
                              <td className="text-right space-x-2">
                                <Button size="sm" onClick={() => { setActiveSub(s); setOpenCharge(true); }}>
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

      {/* Dialog Charge */}
      <ChargeSubscriptionDialog
        open={openCharge}
        onOpenChange={setOpenCharge}
        sub={activeSub}
        accounts={accounts}
        onCharged={() => loadAll()}
      />
    </SidebarProvider>
  );
}
