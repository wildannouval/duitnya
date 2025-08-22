"use client";

import * as React from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";

type Account = { id: string; name: string };
type Category = { id: string; name: string; type: "INCOME" | "EXPENSE" };
type TxType = "INCOME" | "EXPENSE" | "TRANSFER";

const NONE = "__none__"; // sentinel untuk “tidak memilih”

export function QuickCreate({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: () => void; // opsional: refresh halaman pemanggil
}) {
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [type, setType] = React.useState<TxType>("EXPENSE");
  const [accountId, setAccountId] = React.useState<string>("");
  const [fromAccountId, setFromAccountId] = React.useState<string>("");
  const [toAccountId, setToAccountId] = React.useState<string>("");
  const [categoryId, setCategoryId] = React.useState<string>(NONE);
  const [amount, setAmount] = React.useState<string>("0");
  const [date, setDate] = React.useState<string>(() => new Date().toISOString().slice(0,10));
  const [note, setNote] = React.useState<string>("");

  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fmtHint = "Contoh 150000 untuk Rp150.000";

  React.useEffect(() => {
    if (!open) return;
    setLoading(true);
    (async () => {
      try {
        const [aRes, cRes] = await Promise.all([
          fetch("/api/accounts", { cache: "no-store" }),
          fetch("/api/categories", { cache: "no-store" }),
        ]);
        const [a, c] = await Promise.all([aRes.json(), cRes.json()]);
        setAccounts(a);
        setCategories(c);
      } finally {
        setLoading(false);
      }
    })();
  }, [open]);

  const filteredCats = categories.filter(c =>
    type === "INCOME" ? c.type === "INCOME" :
    type === "EXPENSE" ? c.type === "EXPENSE" : true
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amt = Number(String(amount).replace(/[^\d-]/g, ""));
    if (!Number.isFinite(amt) || amt <= 0) return setError("Nominal harus > 0.");

    const body: any = { type, amount: amt, date, note: note.trim() || undefined };

    if (type === "TRANSFER") {
      if (!fromAccountId || !toAccountId || fromAccountId === toAccountId) {
        return setError("Pilih akun sumber & tujuan yang berbeda.");
      }
      body.fromAccountId = fromAccountId;
      body.toAccountId = toAccountId;
    } else {
      if (!accountId) return setError("Pilih akun.");
      body.accountId = accountId;
      if (categoryId !== NONE) body.categoryId = categoryId;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json();
      if (!res.ok) return setError(j?.error ?? "Gagal menyimpan.");

      // reset ringan
      setType("EXPENSE");
      setAccountId(""); setFromAccountId(""); setToAccountId("");
      setCategoryId(NONE); setAmount("0"); setNote("");
      setDate(new Date().toISOString().slice(0,10));

      onOpenChange(false);
      onCreated?.(); // biar halaman pemanggil bisa refresh ringkasan
    } catch {
      setError("Gagal menyimpan.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Tambah Transaksi Cepat</DialogTitle>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-muted-foreground">Memuat data…</p>
        ) : (
          <form onSubmit={onSubmit} className="grid gap-4">
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
                      {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>Kategori (opsional)</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>—</SelectItem>
                      {filteredCats.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
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
                      {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Ke Akun</Label>
                  <Select value={toAccountId} onValueChange={setToAccountId}>
                    <SelectTrigger><SelectValue placeholder="Pilih akun tujuan" /></SelectTrigger>
                    <SelectContent>
                      {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="grid gap-2">
              <Label>Nominal (Rp)</Label>
              <Input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} />
              <p className="text-xs text-muted-foreground">{fmtHint}</p>
            </div>

            <div className="grid gap-2">
              <Label>Tanggal</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>

            <div className="grid gap-2">
              <Label>Catatan (opsional)</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="mis. makan siang / gaji" />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
              <Button type="submit" disabled={submitting}>{submitting ? "Menyimpan..." : "Simpan"}</Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
