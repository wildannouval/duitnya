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
import { formatIDR, parseCurrencyToInt } from "@/lib/money";
import { toast } from "sonner";

type Cat = { id: string; name: string; type: "INCOME" | "EXPENSE"; isBudgetable: boolean };
type Row = {
  id: string;
  month: string;
  categoryId: string;
  amount: number;   // planned
  spent: number;    // calculated from transactions
  createdAt: string;
  category: { id: string; name: string };
};

function prevMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  d.setUTCMonth(d.getUTCMonth() - 1);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default function BudgetPage() {
  const now = new Date();
  const THIS = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [month, setMonth] = React.useState(THIS);
  const [rows, setRows] = React.useState<Row[]>([]);
  const [cats, setCats] = React.useState<Cat[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [creating, setCreating] = React.useState(false);

  // copy controls
  const [copyOverwrite, setCopyOverwrite] = React.useState(false);
  const [copyFactor, setCopyFactor] = React.useState<string>("1");

  // form create
  const budgetable = React.useMemo(
    () => cats.filter((c) => c.type === "EXPENSE" && c.isBudgetable),
    [cats]
  );
  const [categoryId, setCategoryId] = React.useState<string>("");
  const [amount, setAmount] = React.useState("0");

  // inline edit states: { [id]: "12345" (string currency) }
  const [editing, setEditing] = React.useState<Record<string, string | undefined>>({});

  // totals
  const planned = rows.reduce((s, r) => s + r.amount, 0);
  const spent = rows.reduce((s, r) => s + r.spent, 0);
  const remain = planned - spent;

  async function load() {
    setLoading(true);
    try {
      const [bRes, cRes] = await Promise.all([
        fetch(`/api/budgets?month=${month}`, { cache: "no-store" }),
        fetch(`/api/categories`, { cache: "no-store" }),
      ]);
      const [b, c] = await Promise.all([bRes.json(), cRes.json()]);
      setRows(b.items ?? []);
      setCats(c);
      if (!categoryId && (c as Cat[]).length) {
        const firstBudgetable = (c as Cat[]).find((x) => x.type === "EXPENSE" && x.isBudgetable);
        if (firstBudgetable) setCategoryId(firstBudgetable.id);
      }
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseCurrencyToInt(amount);
    if (!categoryId) return toast.error("Pilih kategori");
    if (amt <= 0) return toast.error("Nominal harus > 0");

    setCreating(true);
    try {
      const res = await fetch(`/api/budgets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, categoryId, amount: amt }),
      });
      const j = await res.json();
      if (!res.ok) return toast.error(j?.error ?? "Gagal menyimpan");
      toast.success("Budget disimpan");
      setRows((p) => {
        const exist = p.find((x) => x.categoryId === j.categoryId);
        if (exist) return p.map((x) => (x.categoryId === j.categoryId ? { ...x, amount: j.amount } : x));
        return [j, ...p];
      });
      setAmount("0");
    } finally {
      setCreating(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Hapus budget ini?")) return;
    const res = await fetch(`/api/budgets/${id}`, { method: "DELETE" });
    const j = await res.json();
    if (!res.ok) return toast.error(j?.error ?? "Gagal menghapus");
    setRows((p) => p.filter((x) => x.id !== id));
    toast.success("Dihapus");
  }

  async function onCopy() {
    const from = prevMonth(month);
    const factor = Number(copyFactor);
    if (!Number.isFinite(factor) || factor <= 0) {
      return toast.error("Factor harus angka > 0");
    }
    const res = await fetch(`/api/budgets/copy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fromMonth: from,
        toMonth: month,
        overwrite: copyOverwrite,
        factor,
      }),
    });
    const j = await res.json();
    if (!res.ok) return toast.error(j?.error ?? "Gagal menyalin");
    const msgOverwrite = copyOverwrite ? `, updated: ${j.updated ?? 0}` : ``;
    toast.success(`Disalin dari ${from}: created: ${j.created}${msgOverwrite}, skipped: ${j.skipped ?? 0}`);
    load();
  }

  // Inline edit handlers
  function startEdit(rowId: string, currentAmount: number) {
    setEditing((prev) => ({ ...prev, [rowId]: String(currentAmount) }));
  }

  function cancelEdit(rowId: string) {
    setEditing((prev) => {
      const cp = { ...prev };
      delete cp[rowId];
      return cp;
    });
  }

  async function commitEdit(row: Row) {
    const raw = editing[row.id];
    if (raw == null) return;
    const newInt = parseCurrencyToInt(String(raw));
    if (!Number.isFinite(newInt) || newInt <= 0) {
      toast.error("Nominal harus > 0");
      return;
    }
    if (newInt === row.amount) {
      cancelEdit(row.id);
      return;
    }
    const res = await fetch(`/api/budgets/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: newInt }),
    });
    const j = await res.json();
    if (!res.ok) {
      toast.error(j?.error ?? "Gagal update");
      return;
    }
    setRows((p) => p.map((x) => (x.id === row.id ? { ...x, amount: newInt } : x)));
    cancelEdit(row.id);
    toast.success("Budget diperbarui");
  }

  // UI helpers
  const fmt = (n: number) => formatIDR(n);

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

            {/* Header */}
            <div className="px-4 lg:px-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="text-xl font-semibold">Budget</h1>
                <p className="text-sm text-muted-foreground">Atur anggaran per kategori untuk bulan {month}</p>
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <div className="grid gap-1">
                  <Label>Bulan</Label>
                  <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
                </div>

                {/* Copy controls */}
                <div className="grid gap-1 w-28">
                  <Label>Factor</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={copyFactor}
                    onChange={(e) => setCopyFactor(e.target.value)}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={copyOverwrite}
                    onChange={(e) => setCopyOverwrite(e.target.checked)}
                  />
                  Overwrite
                </label>
                <Button variant="outline" onClick={onCopy}>Copy dari bulan lalu</Button>
              </div>
            </div>

            {/* Ringkasan */}
            <div className="grid gap-4 px-4 lg:grid-cols-3 lg:px-6">
              <Card>
                <CardHeader className="pb-2"><CardTitle>Planned</CardTitle></CardHeader>
                <CardContent className="text-2xl font-semibold">{fmt(planned)}</CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle>Spent</CardTitle></CardHeader>
                <CardContent className="text-2xl font-semibold">{fmt(spent)}</CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle>Remaining</CardTitle></CardHeader>
                <CardContent className={`text-2xl font-semibold ${remain < 0 ? "text-red-600" : ""}`}>{fmt(remain)}</CardContent>
              </Card>
            </div>

            {/* Form tambah */}
            <div className="grid gap-4 px-4 lg:grid-cols-3 lg:px-6">
              <Card className="lg:col-span-2">
                <CardHeader><CardTitle>Tambah / Ubah Budget</CardTitle></CardHeader>
                <CardContent>
                  <form onSubmit={onCreate} className="grid gap-4">
                    <div className="grid gap-2">
                      <Label>Kategori (Expense)</Label>
                      <Select value={categoryId} onValueChange={setCategoryId}>
                        <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                        <SelectContent>
                          {budgetable.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Nominal (Rp)</Label>
                      <InputCurrency value={amount} onValueChange={setAmount} />
                    </div>
                    <Button type="submit" disabled={creating}>{creating ? "Menyimpan…" : "Simpan"}</Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Tips</CardTitle></CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>Inline edit: klik nilai Planned → ketik → <kbd>Enter</kbd> untuk simpan, <kbd>Esc</kbd> untuk batal.</p>
                  <p>“Copy dari bulan lalu” bisa dikali **factor** (mis. 1.1 = naik 10%), dan **overwrite** untuk menimpa yang sudah ada.</p>
                </CardContent>
              </Card>
            </div>

            {/* List */}
            <div className="px-4 lg:px-6">
              <Card>
                <CardHeader><CardTitle>Daftar Budget</CardTitle></CardHeader>
                <CardContent>
                  {loading ? (
                    <p className="text-sm text-muted-foreground">Memuat…</p>
                  ) : rows.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Belum ada baris budget.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="text-left text-muted-foreground">
                          <tr>
                            <th className="py-2">Kategori</th>
                            <th className="text-right">Planned</th>
                            <th className="text-right">Spent</th>
                            <th className="text-right">Remaining</th>
                            <th className="text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows
                            .slice()
                            .sort((a, b) => a.category.name.localeCompare(b.category.name))
                            .map((r) => {
                              const remain = r.amount - r.spent;
                              const isEditing = editing[r.id] != null;

                              return (
                                <tr key={r.id} className="border-t">
                                  <td className="py-2">{r.category?.name ?? r.categoryId}</td>

                                  {/* PLANNED (inline edit) */}
                                  <td className="text-right">
                                    {!isEditing ? (
                                      <button
                                        className="underline-offset-2 hover:underline"
                                        onClick={() => startEdit(r.id, r.amount)}
                                        title="Klik untuk ubah"
                                      >
                                        {formatIDR(r.amount)}
                                      </button>
                                    ) : (
                                      <InlineCurrencyEditor
                                        value={editing[r.id]!}
                                        onChange={(v) =>
                                          setEditing((p) => ({ ...p, [r.id]: v }))
                                        }
                                        onEnter={() => commitEdit(r)}
                                        onEscape={() => cancelEdit(r.id)}
                                      />
                                    )}
                                  </td>

                                  <td className="text-right">{formatIDR(r.spent)}</td>
                                  <td className={`text-right ${remain < 0 ? "text-red-600" : ""}`}>{formatIDR(remain)}</td>

                                  <td className="text-right">
                                    {!isEditing ? (
                                      <Button size="sm" variant="outline" onClick={() => onDelete(r.id)}>Hapus</Button>
                                    ) : (
                                      <div className="flex justify-end gap-2">
                                        <Button size="sm" variant="secondary" onClick={() => cancelEdit(r.id)}>Batal</Button>
                                        <Button size="sm" onClick={() => commitEdit(r)}>Simpan</Button>
                                      </div>
                                    )}
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

/** Editor kecil khusus inline currency (enter/esc) */
function InlineCurrencyEditor({
  value,
  onChange,
  onEnter,
  onEscape,
}: {
  value: string;
  onChange: (v: string) => void;
  onEnter: () => void;
  onEscape: () => void;
}) {
  const ref = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  return (
    <InputCurrency
      ref={ref as any}
      value={value}
      onValueChange={onChange}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onEnter();
        } else if (e.key === "Escape") {
          e.preventDefault();
          onEscape();
        }
      }}
      className="h-8 w-[140px] text-right"
    />
  );
}
