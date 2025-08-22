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

type Account = { id: string; name: string };
type Category = { id: string; name: string; type: "INCOME" | "EXPENSE" };

type TxType = "INCOME" | "EXPENSE" | "TRANSFER";
type TxRow = {
  id: string;
  type: TxType;
  amount: number;
  date: string;
  note?: string | null;
  account?: Account | null;
  fromAccount?: Account | null;
  toAccount?: Account | null;
  category?: Category | null;
  transferGroupId?: string | null;
};

export default function TransactionsPage() {
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [txs, setTxs] = React.useState<TxRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // form
  const [type, setType] = React.useState<TxType>("EXPENSE");
  const [accountId, setAccountId] = React.useState("");
  const [fromAccountId, setFromAccountId] = React.useState("");
  const [toAccountId, setToAccountId] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("");
  const [amount, setAmount] = React.useState("0");
  const [date, setDate] = React.useState<string>(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = React.useState("");

  const fmt = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

  async function loadAll() {
    setLoading(true);
    try {
      const [accRes, catRes, txRes] = await Promise.all([
        fetch("/api/accounts", { cache: "no-store" }),
        fetch("/api/categories", { cache: "no-store" }),
        fetch("/api/transactions", { cache: "no-store" }),
      ]);
      const [acc, cat, tx] = await Promise.all([accRes.json(), catRes.json(), txRes.json()]);
      setAccounts(acc);
      setCategories(cat);
      setTxs(tx);
    } catch {
      setError("Gagal memuat data.");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { loadAll(); }, []);

  const filteredCats = categories.filter((c) =>
    type === "INCOME" ? c.type === "INCOME" : type === "EXPENSE" ? c.type === "EXPENSE" : true
  );

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amt = Number(amount.replace(/[^\d-]/g, ""));
    if (!Number.isFinite(amt) || amt <= 0) return setError("Nominal harus > 0.");

    setSubmitting(true);
    try {
      let payload: any = { type, amount: amt, date, note: note.trim() || undefined };

      if (type === "TRANSFER") {
        if (!fromAccountId || !toAccountId || fromAccountId === toAccountId) {
          setSubmitting(false);
          return setError("Pilih akun berbeda untuk transfer.");
        }
        payload.fromAccountId = fromAccountId;
        payload.toAccountId = toAccountId;
      } else {
        if (!accountId) {
          setSubmitting(false);
          return setError("Pilih akun.");
        }
        payload.accountId = accountId;
        if (categoryId) payload.categoryId = categoryId;
      }

      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const created = await res.json();
      if (!res.ok) return setError(created?.error ?? "Gagal menyimpan transaksi.");

      // created bisa 1 objek (income/expense) atau array 2 objek (transfer)
      const createdRows = Array.isArray(created) ? created : [created];
      setTxs((prev) => [...createdRows, ...prev]);

      // reset form
      setType("EXPENSE");
      setAccountId(""); setFromAccountId(""); setToAccountId("");
      setCategoryId(""); setAmount("0"); setNote("");
      setDate(new Date().toISOString().slice(0, 10));
    } catch {
      setError("Gagal menyimpan transaksi.");
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(id: string) {
    const ok = confirm("Hapus transaksi ini? (Jika transfer, kedua baris akan terhapus)");
    if (!ok) return;
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json();
        alert(j?.error ?? "Gagal menghapus");
        return;
      }
      // refresh list dari server (biar aman utk kasus transfer)
      await loadAll();
    } catch {
      alert("Gagal menghapus");
    }
  }

  return (
    <SidebarProvider style={{ "--sidebar-width": "calc(var(--spacing) * 72)", "--header-height": "calc(var(--spacing) * 12)" } as React.CSSProperties}>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col @container/main">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">

            {/* FORM */}
            <div className="grid gap-4 px-4 lg:grid-cols-3 lg:px-6">
              <Card className="lg:col-span-2">
                <CardHeader><CardTitle>Tambah Transaksi</CardTitle></CardHeader>
                <CardContent>
                  <form onSubmit={onAdd} className="grid gap-4">
                    <div className="grid gap-2">
                      <Label>Jenis</Label>
                      <Select value={type} onValueChange={(v) => setType(v as TxType)}>
                        <SelectTrigger><SelectValue placeholder="Pilih jenis" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="INCOME">INCOME</SelectItem>
                          <SelectItem value="EXPENSE">EXPENSE</SelectItem>
                          <SelectItem value="TRANSFER">TRANSFER</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {type !== "TRANSFER" ? (
                      <>
                        <div className="grid gap-2">
                          <Label>Akun</Label>
                          <Select value={accountId} onValueChange={setAccountId}>
                            <SelectTrigger><SelectValue placeholder="Pilih akun" /></SelectTrigger>
                            <SelectContent>
                              {accounts.map((a) => (
                                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid gap-2">
                          <Label>Kategori (opsional)</Label>
                          <Select value={categoryId} onValueChange={setCategoryId}>
                            <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                            <SelectContent>
                              {filteredCats.map((c) => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="grid gap-2">
                          <Label>Dari Akun</Label>
                          <Select value={fromAccountId} onValueChange={setFromAccountId}>
                            <SelectTrigger><SelectValue placeholder="Pilih akun sumber" /></SelectTrigger>
                            <SelectContent>
                              {accounts.map((a) => (
                                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label>Ke Akun</Label>
                          <Select value={toAccountId} onValueChange={setToAccountId}>
                            <SelectTrigger><SelectValue placeholder="Pilih akun tujuan" /></SelectTrigger>
                            <SelectContent>
                              {accounts.map((a) => (
                                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}

                    <div className="grid gap-2">
                      <Label>Nominal (Rp)</Label>
                      <Input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} />
                    </div>

                    <div className="grid gap-2">
                      <Label>Tanggal</Label>
                      <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                    </div>

                    <div className="grid gap-2">
                      <Label>Catatan (opsional)</Label>
                      <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="mis. makan siang" />
                    </div>

                    {error && <p className="text-sm text-red-600">{error}</p>}

                    <Button type="submit" disabled={submitting}>
                      {submitting ? "Menyimpan..." : "Simpan"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Info</CardTitle></CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>INCOME disimpan positif, EXPENSE negatif.</p>
                  <p>TRANSFER membuat 2 baris (+ dan -) dengan <code>transferGroupId</code> yang sama.</p>
                </CardContent>
              </Card>
            </div>

            {/* LIST */}
            <div className="px-4 lg:px-6">
              <Card>
                <CardHeader><CardTitle>Transaksi Terbaru</CardTitle></CardHeader>
                <CardContent>
                  {loading ? (
                    <p className="text-sm text-muted-foreground">Memuat…</p>
                  ) : txs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Belum ada transaksi.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="text-left text-muted-foreground">
                          <tr>
                            <th className="py-2">Tanggal</th>
                            <th>Jenis</th>
                            <th>Rekening</th>
                            <th>Kategori / Catatan</th>
                            <th className="text-right">Nominal</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {txs.map((t) => (
                            <tr key={t.id} className="border-t">
                              <td className="py-2">{t.date.slice(0,10)}</td>
                              <td>{t.type}</td>
                              <td className="max-w-[220px] truncate">
                                {t.type === "TRANSFER"
                                  ? `${t.fromAccount?.name ?? "-"} ➜ ${t.toAccount?.name ?? "-"}`
                                  : t.account?.name ?? "-"}
                              </td>
                              <td className="max-w-[280px] truncate">
                                {t.type === "TRANSFER"
                                  ? (t.note || "-")
                                  : (t.category?.name ? `${t.category.name}${t.note ? " • " + t.note : ""}` : (t.note || "-"))}
                              </td>
                              <td className="text-right">{fmt(t.amount)}</td>
                              <td className="text-right">
                                <Button variant="outline" size="sm" onClick={() => onDelete(t.id)}>
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
