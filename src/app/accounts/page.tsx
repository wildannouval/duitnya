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

type AccountRow = {
  id: string;
  name: string;
  type: string;
  currency: string;
  initialBalance: number;
  computedBalance: number;
  createdAt: string;
};

type Category = { id: string; name: string; type: "INCOME" | "EXPENSE"; isBudgetable: boolean };

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export default function AccountsPage() {
  const [rows, setRows] = React.useState<AccountRow[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [loading, setLoading] = React.useState(true);

  // ====== Form Tambah Akun ======
  const [accName, setAccName] = React.useState("");
  const [accType, setAccType] = React.useState<"BANK" | "EWALLET" | "CASH">("BANK");
  const [accCurrency, setAccCurrency] = React.useState("IDR");
  const [accInitial, setAccInitial] = React.useState("0");
  const [creating, setCreating] = React.useState(false);

  // ====== Reconcile per-akun ======
  type RecState = {
    actual: string; // digits
    date: string;   // YYYY-MM-DD
    categoryId: string | null; // null = tanpa kategori
    note: string;
  };
  const [rec, setRec] = React.useState<Record<string, RecState>>({});

  const expenseCats = React.useMemo(
    () => categories.filter((c) => c.type === "EXPENSE"),
    [categories]
  );
  const incomeCats = React.useMemo(
    () => categories.filter((c) => c.type === "INCOME"),
    [categories]
  );

  async function load() {
    setLoading(true);
    try {
      const [bRes, cRes] = await Promise.all([
        fetch("/api/accounts/balances", { cache: "no-store" }),
        fetch("/api/categories", { cache: "no-store" }),
      ]);
      const [b, c] = await Promise.all([bRes.json(), cRes.json()]);
      setRows(b ?? []);
      setCategories(c ?? []);

      // init state rec
      setRec((prev) => {
        const next: Record<string, RecState> = { ...prev };
        (b as AccountRow[]).forEach((r) => {
          if (!next[r.id]) {
            next[r.id] = {
              actual: String(Math.max(0, r.computedBalance)),
              date: todayStr(),
              categoryId: null,
              note: "",
            };
          }
        });
        return next;
      });
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
  }, []);

  function setRecState(id: string, update: (s: RecState) => RecState) {
    setRec((prev) => ({
      ...prev,
      [id]:
        update(
          prev[id] ?? { actual: "0", date: todayStr(), categoryId: null, note: "" }
        ),
    }));
  }

  async function doReconcile(row: AccountRow) {
    const st = rec[row.id] ?? { actual: "0", date: todayStr(), categoryId: null, note: "" };
    const actual = Math.round(Number(st.actual || "0"));
    if (!Number.isFinite(actual)) return toast.error("Saldo riil tidak valid");

    const res = await fetch("/api/accounts/reconcile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountId: row.id,
        actualBalance: actual,
        date: st.date,
        categoryId: st.categoryId ?? undefined,
        note: st.note || undefined,
      }),
    });
    const j = await res.json();
    if (!res.ok) return toast.error(j?.error ?? "Gagal reconcile");

    if (j.delta === 0) {
      toast.info("Saldo sudah sesuai, tidak ada penyesuaian.");
    } else {
      toast.success(
        `Reconcile berhasil (delta: ${j.delta > 0 ? "+" : ""}${formatIDR(Math.abs(j.delta))})`
      );
      load();
    }
  }

  async function createAccount(e: React.FormEvent) {
    e.preventDefault();
    const name = accName.trim();
    const initial = Math.round(Number(accInitial || "0"));
    if (!name) return toast.error("Nama akun wajib diisi");
    if (!Number.isFinite(initial)) return toast.error("Initial balance tidak valid");

    setCreating(true);
    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          type: accType,
          currency: accCurrency || "IDR",
          initialBalance: initial,
        }),
      });
      const j = await res.json();
      if (!res.ok) return toast.error(j?.error ?? "Gagal menambah akun");
      toast.success("Akun ditambahkan");

      // reset form
      setAccName("");
      setAccType("BANK");
      setAccCurrency("IDR");
      setAccInitial("0");

      // refresh balances
      await load();
    } finally {
      setCreating(false);
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

            <div className="px-4 lg:px-6">
              <h1 className="text-xl font-semibold">Akun</h1>
              <p className="text-sm text-muted-foreground">
                Tambah akun baru dan cocokan saldo (reconcile) dengan saldo riil.
              </p>
            </div>

            {/* ===== Form Tambah Akun ===== */}
            <div className="px-4 lg:px-6">
              <Card>
                <CardHeader><CardTitle>Tambah Akun</CardTitle></CardHeader>
                <CardContent>
                  <form className="grid gap-4 md:grid-cols-4" onSubmit={createAccount}>
                    <div className="grid gap-1 md:col-span-2">
                      <Label>Nama Akun</Label>
                      <Input
                        value={accName}
                        onChange={(e) => setAccName(e.target.value)}
                        placeholder="BCA, Dana, Dompet, dll."
                      />
                    </div>

                    <div className="grid gap-1">
                      <Label>Tipe</Label>
                      <Select value={accType} onValueChange={(v) => setAccType(v as any)}>
                        <SelectTrigger><SelectValue placeholder="Pilih tipe" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BANK">BANK</SelectItem>
                          <SelectItem value="EWALLET">EWALLET</SelectItem>
                          <SelectItem value="CASH">CASH</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-1">
                      <Label>Mata Uang</Label>
                      <Input
                        value={accCurrency}
                        onChange={(e) => setAccCurrency(e.target.value.toUpperCase())}
                        placeholder="IDR"
                      />
                    </div>

                    <div className="grid gap-1">
                      <Label>Saldo Awal (Rp)</Label>
                      <InputCurrency value={accInitial} onValueChange={setAccInitial} />
                    </div>

                    <div className="md:col-span-4">
                      <Button type="submit" disabled={creating}>
                        {creating ? "Menyimpan…" : "Simpan"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* ===== Tabel Reconcile ===== */}
            <div className="px-4 lg:px-6">
              <Card>
                <CardHeader><CardTitle>Daftar Akun & Reconcile</CardTitle></CardHeader>
                <CardContent>
                  {loading ? (
                    <p className="text-sm text-muted-foreground">Memuat…</p>
                  ) : rows.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Belum ada akun.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="text-left text-muted-foreground">
                          <tr>
                            <th className="py-2">Nama</th>
                            <th>Jenis</th>
                            <th className="text-right">Initial</th>
                            <th className="text-right">Terhitung</th>
                            <th className="text-right">Selisih</th>
                            <th className="text-right">Saldo Riil</th>
                            <th>Tanggal</th>
                            <th>Kategori (opsional)</th>
                            <th>Catatan</th>
                            <th className="text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((r) => {
                            const st = rec[r.id] ?? { actual: "0", date: todayStr(), categoryId: null, note: "" };
                            const diff = (Number(st.actual || "0") || 0) - r.computedBalance;
                            const catList = diff < 0 ? expenseCats : incomeCats;

                            return (
                              <tr key={r.id} className="border-t align-top">
                                <td className="py-2">
                                  <div className="font-medium">{r.name}</div>
                                  <div className="text-xs text-muted-foreground">{r.currency}</div>
                                </td>
                                <td>{r.type}</td>
                                <td className="text-right">{formatIDR(r.initialBalance)}</td>
                                <td className="text-right font-medium">{formatIDR(r.computedBalance)}</td>
                                <td className={`text-right ${diff < 0 ? "text-red-600" : diff > 0 ? "text-green-700" : ""}`}>
                                  {diff === 0 ? "—" : (diff > 0 ? "+" : "-") + formatIDR(Math.abs(diff))}
                                </td>
                                <td className="text-right">
                                  <InputCurrency
                                    value={st.actual}
                                    onValueChange={(v) =>
                                      setRecState(r.id, (p) => ({ ...p, actual: v }))
                                    }
                                    className="h-8 w-[140px]"
                                  />
                                </td>
                                <td>
                                  <Input
                                    type="date"
                                    value={st.date}
                                    onChange={(e) =>
                                      setRecState(r.id, (p) => ({ ...p, date: e.target.value }))
                                    }
                                    className="h-8"
                                  />
                                </td>
                                <td>
                                  <Select
                                    value={st.categoryId ?? "__NONE__"}
                                    onValueChange={(v) =>
                                      setRecState(r.id, (p) => ({
                                        ...p,
                                        categoryId: v === "__NONE__" ? null : v,
                                      }))
                                    }
                                  >
                                    <SelectTrigger className="h-8 w-[200px]">
                                      <SelectValue placeholder="(Tanpa kategori)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="__NONE__">(Tanpa kategori)</SelectItem>
                                      {catList.map((c) => (
                                        <SelectItem key={c.id} value={c.id}>
                                          {c.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </td>
                                <td>
                                  <Input
                                    value={st.note}
                                    onChange={(e) =>
                                      setRecState(r.id, (p) => ({ ...p, note: e.target.value }))
                                    }
                                    placeholder="Reconcile saldo"
                                    className="h-8 w-[200px]"
                                  />
                                </td>
                                <td className="text-right">
                                  <Button size="sm" onClick={() => doReconcile(r)}>
                                    Reconcile
                                  </Button>
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