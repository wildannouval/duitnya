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
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

type Debt = {
  id: string;
  kind: "HUTANG" | "PIUTANG";
  counterpartyName: string;
  principalAmount: number;
  remainingAmount: number;
  dueDate: string | null;
  status: "OPEN" | "PAID";
  createdAt: string;
  payments: { id: string; date: string; amount: number; accountId: string | null }[];
};

type Account = { id: string; name: string };

// sentinel untuk opsi “tanpa akun” (tidak boleh pakai string kosong "")
const NONE = "__none__";

export default function DebtsPage() {
  const [debts, setDebts] = React.useState<Debt[]>([]);
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // filter
  const [kindFilter, setKindFilter] = React.useState<"HUTANG" | "PIUTANG">("HUTANG");
  const [statusFilter, setStatusFilter] = React.useState<"OPEN" | "PAID">("OPEN");

  // form add debt
  const [kind, setKind] = React.useState<"HUTANG" | "PIUTANG">("HUTANG");
  const [name, setName] = React.useState("");
  const [amount, setAmount] = React.useState("0");
  const [due, setDue] = React.useState<string>("");

  // inline payment form state
  const [openPayId, setOpenPayId] = React.useState<string | null>(null);
  const [payAmount, setPayAmount] = React.useState("0");
  const [payDate, setPayDate] = React.useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [payAccountId, setPayAccountId] = React.useState<string>("");

  const fmt = (n: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(n);

  async function loadAll() {
    setLoading(true);
    try {
      const [dRes, aRes] = await Promise.all([
        fetch(`/api/debts?kind=${kindFilter}&status=${statusFilter}`, {
          cache: "no-store",
        }),
        fetch(`/api/accounts`, { cache: "no-store" }),
      ]);
      const [d, a] = await Promise.all([dRes.json(), aRes.json()]);
      setDebts(d);
      setAccounts(a);
    } catch {
      setError("Gagal memuat data.");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kindFilter, statusFilter]);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amt = Number(amount.replace(/[^\d-]/g, ""));
    if (!name.trim()) return setError("Nama wajib diisi.");
    if (!Number.isFinite(amt) || amt <= 0) return setError("Nominal harus > 0.");

    const body: any = {
      kind,
      counterpartyName: name.trim(),
      principalAmount: amt,
    };
    if (due) body.dueDate = due;

    const res = await fetch("/api/debts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const created = await res.json();
    if (!res.ok) return setError(created?.error ?? "Gagal menambah.");

    await loadAll();
    setKind("HUTANG");
    setName("");
    setAmount("0");
    setDue("");
  }

  async function onDelete(debtId: string) {
    const ok = confirm("Hapus hutang/piutang ini? (hapus payment dulu jika ada)");
    if (!ok) return;
    const res = await fetch(`/api/debts/${debtId}`, { method: "DELETE" });
    if (!res.ok) {
      const j = await res.json();
      alert(j?.error ?? "Gagal menghapus.");
      return;
    }
    await loadAll();
  }

  async function onMarkPaid(debtId: string) {
    const ok = confirm("Tandai sebagai LUNAS?");
    if (!ok) return;
    const res = await fetch(`/api/debts/${debtId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PAID" }),
    });
    if (!res.ok) {
      const j = await res.json();
      alert(j?.error ?? "Gagal update status.");
      return;
    }
    await loadAll();
  }

  async function onAddPayment(debt: Debt) {
    setError(null);
    const amt = Number(payAmount.replace(/[^\d-]/g, ""));
    if (!Number.isFinite(amt) || amt <= 0)
      return setError("Nominal pembayaran harus > 0.");
    if (amt > debt.remainingAmount) return setError("Nominal melebihi sisa.");

    const res = await fetch(`/api/debts/${debt.id}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: payDate,
        amount: amt,
        accountId: payAccountId || undefined,
      }),
    });
    const created = await res.json();
    if (!res.ok) return setError(created?.error ?? "Gagal menambah pembayaran.");

    setOpenPayId(null);
    setPayAmount("0");
    setPayAccountId("");
    await loadAll();
  }

  async function onDeletePayment(paymentId: string) {
    const ok = confirm("Hapus pembayaran ini?");
    if (!ok) return;
    const res = await fetch(`/api/debts/payments/${paymentId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const j = await res.json();
      alert(j?.error ?? "Gagal menghapus pembayaran.");
      return;
    }
    await loadAll();
  }

  const title =
    kindFilter === "HUTANG"
      ? "Hutang (saya berutang)"
      : "Piutang (orang berutang ke saya)";

  // helper tampilan due
  const dueBadge = (d: Debt) => {
    if (!d.dueDate) return <span className="text-xs text-muted-foreground">—</span>;
    const due = new Date(d.dueDate);
    const today = new Date();
    const diff = Math.ceil((+due - +today) / (1000 * 60 * 60 * 24));
    let cls = "text-xs";
    let label = `Jatuh tempo ${due.toISOString().slice(0, 10)}`;
    if (diff < 0) {
      cls += " text-red-600";
      label += ` (${Math.abs(diff)} hari lewat)`;
    } else if (diff === 0) {
      cls += " text-orange-600";
      label += " (hari ini)";
    } else {
      cls += " text-muted-foreground";
      label += ` (dlm ${diff} hari)`;
    }
    return <span className={cls}>{label}</span>;
  };

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
            {/* Header & Filter */}
            <div className="px-4 lg:px-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="text-xl font-semibold">Hutang – Piutang</h1>
                <p className="text-sm text-muted-foreground">{title}</p>
              </div>
              <div className="flex gap-2">
                <Select
                  value={kindFilter}
                  onValueChange={(v) => setKindFilter(v as any)}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Jenis" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HUTANG">HUTANG</SelectItem>
                    <SelectItem value="PIUTANG">PIUTANG</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={statusFilter}
                  onValueChange={(v) => setStatusFilter(v as any)}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPEN">OPEN</SelectItem>
                    <SelectItem value="PAID">PAID</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Form tambah */}
            <div className="grid gap-4 px-4 lg:grid-cols-3 lg:px-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>
                    Tambah {kind === "HUTANG" ? "Hutang" : "Piutang"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={onAdd} className="grid gap-4">
                    <div className="grid gap-2">
                      <Label>Jenis</Label>
                      <Select value={kind} onValueChange={(v) => setKind(v as any)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih jenis" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="HUTANG">HUTANG</SelectItem>
                          <SelectItem value="PIUTANG">PIUTANG</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Nama Pihak</Label>
                      <Input
                        placeholder="Mis. Budi / Toko XYZ"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Nominal Pokok (Rp)</Label>
                      <Input
                        inputMode="numeric"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Jatuh Tempo (opsional)</Label>
                      <Input
                        type="date"
                        value={due}
                        onChange={(e) => setDue(e.target.value)}
                      />
                    </div>
                    {error && <p className="text-sm text-red-600">{error}</p>}
                    <Button type="submit">Simpan</Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Ringkasan</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span>Total Item</span>
                    <span className="font-medium">{debts.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Pokok</span>
                    <span className="font-medium">
                      {fmt(debts.reduce((s, d) => s + d.principalAmount, 0))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Sisa</span>
                    <span className="font-medium">
                      {fmt(debts.reduce((s, d) => s + d.remainingAmount, 0))}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* List */}
            <div className="px-4 lg:px-6">
              <Card>
                <CardHeader>
                  <CardTitle>Daftar {title}</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <p className="text-sm text-muted-foreground">Memuat…</p>
                  ) : debts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Belum ada data.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="text-left text-muted-foreground">
                          <tr>
                            <th className="py-2">Pihak</th>
                            <th>Pokok</th>
                            <th>Sisa</th>
                            <th>Jatuh Tempo</th>
                            <th>Status</th>
                            <th className="text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {debts.map((d) => (
                            <React.Fragment key={d.id}>
                              <tr className="border-t align-top">
                                <td className="py-2">
                                  <div className="font-medium">
                                    {d.counterpartyName}
                                  </div>
                                  <div>{dueBadge(d)}</div>
                                  {d.payments.length > 0 && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                      {d.payments.length} pembayaran
                                    </div>
                                  )}
                                </td>
                                <td>{fmt(d.principalAmount)}</td>
                                <td
                                  className={
                                    d.remainingAmount === 0
                                      ? "text-green-600 font-medium"
                                      : ""
                                  }
                                >
                                  {fmt(d.remainingAmount)}
                                </td>
                                <td>{d.dueDate ? d.dueDate.slice(0, 10) : "—"}</td>
                                <td>{d.status}</td>
                                <td className="text-right space-x-2">
                                  {d.status === "OPEN" && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setOpenPayId(d.id);
                                        setPayAmount("0");
                                      }}
                                    >
                                      Tambah Bayar
                                    </Button>
                                  )}
                                  {d.status === "OPEN" && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => onMarkPaid(d.id)}
                                    >
                                      Tandai Lunas
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => onDelete(d.id)}
                                  >
                                    Hapus
                                  </Button>
                                </td>
                              </tr>

                              {/* Row form pembayaran (expand) */}
                              {openPayId === d.id && (
                                <tr className="border-t bg-muted/30">
                                  <td colSpan={6} className="p-3">
                                    <div className="grid gap-3 md:grid-cols-5">
                                      <div className="grid gap-1">
                                        <Label>Nominal</Label>
                                        <Input
                                          inputMode="numeric"
                                          value={payAmount}
                                          onChange={(e) => setPayAmount(e.target.value)}
                                        />
                                      </div>
                                      <div className="grid gap-1">
                                        <Label>Tanggal</Label>
                                        <Input
                                          type="date"
                                          value={payDate}
                                          onChange={(e) => setPayDate(e.target.value)}
                                        />
                                      </div>
                                      <div className="grid gap-1 md:col-span-2">
                                        <Label>Akun (opsional)</Label>
                                        <Select
                                          value={payAccountId || NONE}
                                          onValueChange={(v) =>
                                            setPayAccountId(v === NONE ? "" : v)
                                          }
                                        >
                                          <SelectTrigger>
                                            <SelectValue placeholder="Pilih akun (opsional)" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value={NONE}>—</SelectItem>
                                            {accounts.map((a) => (
                                              <SelectItem key={a.id} value={a.id}>
                                                {a.name}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div className="flex items-end gap-2">
                                        <Button
                                          size="sm"
                                          onClick={() => onAddPayment(d)}
                                        >
                                          Simpan
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => setOpenPayId(null)}
                                        >
                                          Batal
                                        </Button>
                                      </div>
                                    </div>

                                    {/* daftar pembayaran singkat */}
                                    {d.payments.length > 0 && (
                                      <div className="mt-3 overflow-x-auto">
                                        <table className="w-full text-xs">
                                          <thead className="text-left text-muted-foreground">
                                            <tr>
                                              <th className="py-1">Tanggal</th>
                                              <th>Akun</th>
                                              <th className="text-right">
                                                Nominal
                                              </th>
                                              <th></th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {d.payments.map((p) => (
                                              <tr key={p.id} className="border-t">
                                                <td className="py-1">
                                                  {p.date.slice(0, 10)}
                                                </td>
                                                <td>
                                                  {p.accountId
                                                    ? accounts.find(
                                                        (a) => a.id === p.accountId
                                                      )?.name ?? p.accountId
                                                    : "—"}
                                                </td>
                                                <td className="text-right">
                                                  {fmt(p.amount)}
                                                </td>
                                                <td className="text-right">
                                                  <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() =>
                                                      onDeletePayment(p.id)
                                                    }
                                                  >
                                                    Hapus
                                                  </Button>
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
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
