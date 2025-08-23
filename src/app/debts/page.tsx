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
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { InputCurrency } from "@/components/input-currency";
import { formatIDR } from "@/lib/money";
import { toast } from "sonner";

type DebtKind = "HUTANG" | "PIUTANG";

type Account = { id: string; name: string };
type Category = { id: string; name: string; type: "INCOME" | "EXPENSE"; isBudgetable: boolean };

type DebtPayment = {
  id: string;
  amount: number;
  date: string; // ISO
  accountId: string | null;
  transactionId: string | null;
};

type Debt = {
  id: string;
  kind: DebtKind;
  counterpartyName: string;
  principalAmount: number;
  remainingAmount: number;
  dueDate: string | null; // ISO
  status?: string;
  createdAt: string;
  payments?: DebtPayment[];
};

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export default function DebtsPage() {
  // data
  const [debts, setDebts] = React.useState<Debt[]>([]);
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [loading, setLoading] = React.useState(true);

  // form tambah debt
  const [newKind, setNewKind] = React.useState<DebtKind>("HUTANG");
  const [newName, setNewName] = React.useState("");
  const [newAmount, setNewAmount] = React.useState("0");
  const [newDue, setNewDue] = React.useState<string>("");

  // per-debt payment form state
  type PayState = {
    open: boolean;
    amount: string; // string digits
    date: string; // YYYY-MM-DD
    createTx: boolean;
    accountId: string; // required if createTx true
    categoryId: string | null; // optional (use "__NONE__" sentinel on UI)
    note: string;
  };
  const [pay, setPay] = React.useState<Record<string, PayState>>({});

  const expenseCats = React.useMemo(
    () => categories.filter((c) => c.type === "EXPENSE"),
    [categories]
  );
  const incomeCats = React.useMemo(
    () => categories.filter((c) => c.type === "INCOME"),
    [categories]
  );

  async function loadAll() {
    setLoading(true);
    try {
      const [dRes, aRes, cRes] = await Promise.all([
        fetch("/api/debts", { cache: "no-store" }),
        fetch("/api/accounts", { cache: "no-store" }),
        fetch("/api/categories", { cache: "no-store" }),
      ]);
      const [d, a, c] = await Promise.all([dRes.json(), aRes.json(), cRes.json()]);
      setDebts(Array.isArray(d) ? d : d?.items ?? []);
      setAccounts(a ?? []);
      setCategories(c ?? []);
    } catch {
      toast.error("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    loadAll();
  }, []);

  function ensurePayState(debt: Debt): PayState {
    const current = pay[debt.id];
    if (current) return current;
    const defaultAccount = accounts[0]?.id ?? "";
    return {
      open: false,
      amount: String(Math.max(0, debt.remainingAmount)),
      date: todayStr(),
      createTx: true,
      accountId: defaultAccount,
      categoryId: null,
      note: "",
    };
  }

  function setPayState(debtId: string, updater: (prev: PayState) => PayState) {
    setPay((prev) => {
      const base = prev[debtId] ?? {
        open: false,
        amount: "0",
        date: todayStr(),
        createTx: true,
        accountId: accounts[0]?.id ?? "",
        categoryId: null,
        note: "",
      };
      return { ...prev, [debtId]: updater(base) };
    });
  }

  async function submitNewDebt(e: React.FormEvent) {
    e.preventDefault();
    const amountInt = Math.max(0, Math.round(Number(newAmount || "0")));
    if (!newName.trim()) return toast.error("Nama / lawan transaksi wajib diisi");
    if (amountInt <= 0) return toast.error("Nominal harus > 0");

    try {
      const res = await fetch("/api/debts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: newKind,
          counterpartyName: newName.trim(),
          principalAmount: amountInt,
          dueDate: newDue ? new Date(newDue).toISOString() : null,
        }),
      });
      const j = await res.json();
      if (!res.ok) return toast.error(j?.error ?? "Gagal membuat debt");
      toast.success("Debt ditambahkan");
      setNewName("");
      setNewAmount("0");
      setNewDue("");
      loadAll();
    } catch {
      toast.error("Gagal membuat debt");
    }
  }

  async function submitPayment(debt: Debt) {
    const st = ensurePayState(debt);
    const amt = Math.max(0, Math.round(Number(st.amount || "0")));
    if (amt <= 0) return toast.error("Nominal harus > 0");
    if (st.createTx && !st.accountId) return toast.error("Pilih akun untuk transaksi");

    try {
      const res = await fetch(`/api/debts/${debt.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amt,
          date: st.date,
          accountId: st.createTx ? st.accountId : undefined,
          categoryId: st.categoryId ?? undefined,
          note: st.note || undefined,
          createTransaction: st.createTx,
        }),
      });
      const j = await res.json();
      if (!res.ok) return toast.error(j?.error ?? "Gagal mencatat pembayaran");
      toast.success(
        "Pembayaran tercatat" + (j?.linkedTransactionId ? " & transaksi dibuat" : "")
      );
      // Reset panel debt tsb & refresh list
      setPayState(debt.id, (p) => ({ ...p, open: false }));
      loadAll();
    } catch {
      toast.error("Gagal mencatat pembayaran");
    }
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

            {/* HEADER */}
            <div className="px-4 lg:px-6">
              <h1 className="text-xl font-semibold">Hutang & Piutang</h1>
              <p className="text-sm text-muted-foreground">
                Catat hutang (kamu berutang) dan piutang (orang lain berutang ke kamu), serta pembayaran per-debt.
              </p>
            </div>

            {/* FORM TAMBAH DEBT */}
            <div className="grid gap-4 px-4 lg:grid-cols-3 lg:px-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Tambah Debt</CardTitle>
                </CardHeader>
                <CardContent>
                  <form className="grid gap-4" onSubmit={submitNewDebt}>
                    <div className="grid gap-2">
                      <Label>Jenis</Label>
                      <Select value={newKind} onValueChange={(v: DebtKind) => setNewKind(v)}>
                        <SelectTrigger><SelectValue placeholder="Pilih jenis" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="HUTANG">HUTANG (kamu berutang)</SelectItem>
                          <SelectItem value="PIUTANG">PIUTANG (orang berutang ke kamu)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label>Nama / Lawan Transaksi</Label>
                      <Input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Mis: Budi / Bank / Teman"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label>Nominal (Rp)</Label>
                      <InputCurrency value={newAmount} onValueChange={setNewAmount} />
                    </div>

                    <div className="grid gap-2">
                      <Label>Jatuh Tempo (opsional)</Label>
                      <Input
                        type="date"
                        value={newDue}
                        onChange={(e) => setNewDue(e.target.value)}
                      />
                    </div>

                    <Button type="submit">Simpan</Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Ringkasan</CardTitle></CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-1">
                  <p>
                    <b>Total Hutang:</b>{" "}
                    {formatIDR(
                      debts.filter((d) => d.kind === "HUTANG").reduce((s, x) => s + x.remainingAmount, 0)
                    )}
                  </p>
                  <p>
                    <b>Total Piutang:</b>{" "}
                    {formatIDR(
                      debts.filter((d) => d.kind === "PIUTANG").reduce((s, x) => s + x.remainingAmount, 0)
                    )}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* LIST DEBT */}
            <div className="px-4 lg:px-6">
              <Card>
                <CardHeader><CardTitle>Daftar Debt</CardTitle></CardHeader>
                <CardContent>
                  {loading ? (
                    <p className="text-sm text-muted-foreground">Memuat…</p>
                  ) : debts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Belum ada data.</p>
                  ) : (
                    <div className="space-y-4">
                      {debts
                        .slice()
                        .sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""))
                        .map((d) => {
                          const st = ensurePayState(d);
                          const payCats = d.kind === "HUTANG" ? expenseCats : incomeCats;
                          const remain = d.remainingAmount;
                          const progress =
                            d.principalAmount > 0
                              ? Math.round(((d.principalAmount - remain) / d.principalAmount) * 100)
                              : 0;

                          return (
                            <div key={d.id} className="rounded-lg border p-4">
                              {/* header */}
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  <span
                                    className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
                                      d.kind === "HUTANG"
                                        ? "bg-red-100 text-red-700"
                                        : "bg-green-100 text-green-700"
                                    }`}
                                  >
                                    {d.kind}
                                  </span>
                                  <div>
                                    <div className="font-medium">{d.counterpartyName}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {d.dueDate ? `Jatuh tempo: ${new Date(d.dueDate).toLocaleDateString()}` : "Tanpa jatuh tempo"}
                                      {d.status ? ` · Status: ${d.status}` : ""}
                                    </div>
                                  </div>
                                </div>

                                <div className="text-right">
                                  <div className="text-sm">
                                    <span className="text-muted-foreground">Sisa:</span>{" "}
                                    <b>{formatIDR(remain)}</b>
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    dari {formatIDR(d.principalAmount)} · {Math.max(0, Math.min(100, progress))}%
                                  </div>
                                </div>
                              </div>

                              {/* payments list */}
                              {d.payments && d.payments.length > 0 ? (
                                <div className="mt-3 overflow-x-auto">
                                  <table className="w-full text-sm">
                                    <thead className="text-left text-muted-foreground">
                                      <tr>
                                        <th className="py-2">Tanggal</th>
                                        <th className="text-right">Jumlah</th>
                                        <th>Akun</th>
                                        <th>Transaksi</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {d.payments.map((p) => (
                                        <tr key={p.id} className="border-t">
                                          <td className="py-2">
                                            {new Date(p.date).toLocaleDateString()}
                                          </td>
                                          <td className="text-right">{formatIDR(p.amount)}</td>
                                          <td>{p.accountId ?? "-"}</td>
                                          <td className="text-xs">
                                            {p.transactionId ? (
                                              <span className="inline-flex items-center rounded bg-muted px-2 py-0.5">
                                                tx: {p.transactionId}
                                              </span>
                                            ) : (
                                              "-"
                                            )}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <p className="mt-2 text-xs text-muted-foreground">Belum ada pembayaran.</p>
                              )}

                              {/* payment form toggle */}
                              <div className="mt-3">
                                {!st.open ? (
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      setPayState(d.id, (p) => ({
                                        ...p,
                                        open: true,
                                        // default isikan sisa
                                        amount: String(Math.max(0, d.remainingAmount)),
                                      }))
                                    }
                                  >
                                    {d.kind === "HUTANG" ? "Bayar Hutang" : "Terima Piutang"}
                                  </Button>
                                ) : (
                                  <div className="rounded-md border p-3">
                                    <div className="grid gap-3 md:grid-cols-2">
                                      <div className="grid gap-1">
                                        <Label>Nominal (Rp)</Label>
                                        <InputCurrency
                                          value={st.amount}
                                          onValueChange={(v) =>
                                            setPayState(d.id, (p) => ({ ...p, amount: v }))
                                          }
                                        />
                                      </div>
                                      <div className="grid gap-1">
                                        <Label>Tanggal</Label>
                                        <Input
                                          type="date"
                                          value={st.date}
                                          onChange={(e) =>
                                            setPayState(d.id, (p) => ({ ...p, date: e.target.value }))
                                          }
                                        />
                                      </div>

                                      <div className="grid gap-1 md:col-span-2">
                                        <label className="inline-flex items-center gap-2 text-sm">
                                          <input
                                            type="checkbox"
                                            checked={st.createTx}
                                            onChange={(e) =>
                                              setPayState(d.id, (p) => ({ ...p, createTx: e.target.checked }))
                                            }
                                          />
                                          Catat ke Transaksi
                                        </label>
                                      </div>

                                      {st.createTx ? (
                                        <>
                                          <div className="grid gap-1">
                                            <Label>Akun</Label>
                                            <Select
                                              value={st.accountId}
                                              onValueChange={(v) =>
                                                setPayState(d.id, (p) => ({ ...p, accountId: v }))
                                              }
                                            >
                                              <SelectTrigger>
                                                <SelectValue placeholder="Pilih akun" />
                                              </SelectTrigger>
                                              <SelectContent>
                                                {accounts.map((a) => (
                                                  <SelectItem key={a.id} value={a.id}>
                                                    {a.name}
                                                  </SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          </div>

                                          <div className="grid gap-1">
                                            <Label>Kategori (opsional)</Label>
                                            <Select
                                              value={st.categoryId ?? "__NONE__"}
                                              onValueChange={(v) =>
                                                setPayState(d.id, (p) => ({
                                                  ...p,
                                                  categoryId: v === "__NONE__" ? null : v,
                                                }))
                                              }
                                            >
                                              <SelectTrigger>
                                                <SelectValue placeholder="(Kosongkan jika tidak perlu)" />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="__NONE__">(Tanpa kategori)</SelectItem>
                                                {payCats.map((c) => (
                                                  <SelectItem key={c.id} value={c.id}>
                                                    {c.name}
                                                  </SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          </div>
                                        </>
                                      ) : null}

                                      <div className="grid gap-1 md:col-span-2">
                                        <Label>Catatan (opsional)</Label>
                                        <Input
                                          value={st.note}
                                          onChange={(e) =>
                                            setPayState(d.id, (p) => ({ ...p, note: e.target.value }))
                                          }
                                          placeholder="Contoh: cicilan ke-2, via transfer"
                                        />
                                      </div>
                                    </div>

                                    <div className="mt-3 flex gap-2">
                                      <Button
                                        size="sm"
                                        onClick={() => submitPayment(d)}
                                      >
                                        Simpan Pembayaran
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={() =>
                                          setPayState(d.id, (p) => ({ ...p, open: false }))
                                        }
                                      >
                                        Batal
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
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
