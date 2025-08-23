"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { InputCurrency } from "@/components/input-currency";
import { toast } from "sonner";

type TxType = "INCOME" | "EXPENSE" | "TRANSFER";
type Account = { id: string; name: string };
type Category = { id: string; name: string; type: "INCOME" | "EXPENSE"; isBudgetable: boolean };

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

export function QuickCreateDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess?: () => void;
}) {
  const [type, setType] = React.useState<TxType>("EXPENSE");
  const [amount, setAmount] = React.useState("0");
  const [date, setDate] = React.useState(today());
  const [note, setNote] = React.useState("");

  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [accountId, setAccountId] = React.useState<string>("");
  const [categoryId, setCategoryId] = React.useState<string | null>("__NONE__");

  // transfer
  const [fromAccountId, setFromAccountId] = React.useState<string>("");
  const [toAccountId, setToAccountId] = React.useState<string>("");

  React.useEffect(() => {
    if (!open) return;
    (async () => {
      const [aRes, cRes] = await Promise.all([
        fetch("/api/accounts", { cache: "no-store" }),
        fetch("/api/categories", { cache: "no-store" }),
      ]);
      const [a, c] = await Promise.all([aRes.json(), cRes.json()]);
      setAccounts(a ?? []);
      setCategories(c ?? []);
      if (!accountId && (a?.length ?? 0) > 0) setAccountId(a[0].id);
      if (!fromAccountId && (a?.length ?? 0) > 0) setFromAccountId(a[0].id);
      if (!toAccountId && (a?.length ?? 1) > 1) setToAccountId(a[1].id);
    })();
  }, [open]); // eslint-disable-line

  const catList = categories.filter((c) =>
    type === "INCOME" ? c.type === "INCOME" : c.type === "EXPENSE"
  );

  async function submit() {
    const amt = Math.round(Number(amount || "0"));
    if (!Number.isFinite(amt) || amt <= 0) return toast.error("Nominal harus > 0");
    const body: any = { type, amount: amt, date, note: note || undefined };

    if (type === "TRANSFER") {
      if (!fromAccountId || !toAccountId) return toast.error("Pilih akun asal & tujuan");
      if (fromAccountId === toAccountId) return toast.error("Akun asal & tujuan tidak boleh sama");
      body.fromAccountId = fromAccountId;
      body.toAccountId = toAccountId;
    } else {
      if (!accountId) return toast.error("Pilih akun");
      body.accountId = accountId;
      const cat = categoryId && categoryId !== "__NONE__" ? categoryId : undefined;
      if (cat) body.categoryId = cat;
    }

    const res = await fetch("/api/quick-create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await res.json();
    if (!res.ok) return toast.error(j?.error ?? "Gagal menyimpan");
    toast.success("Tersimpan");
    onOpenChange(false);
    setAmount("0");
    setNote("");
    onSuccess?.();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Quick Create</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-1">
            <Label>Jenis</Label>
            <Select value={type} onValueChange={(v) => setType(v as TxType)}>
              <SelectTrigger><SelectValue placeholder="Pilih jenis" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="EXPENSE">Pengeluaran</SelectItem>
                <SelectItem value="INCOME">Pemasukan</SelectItem>
                <SelectItem value="TRANSFER">Transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1">
            <Label>Nominal (Rp)</Label>
            <InputCurrency value={amount} onValueChange={setAmount} />
          </div>

          <div className="grid gap-1">
            <Label>Tanggal</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          {type === "TRANSFER" ? (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="grid gap-1">
                <Label>Dari Akun</Label>
                <Select value={fromAccountId} onValueChange={setFromAccountId}>
                  <SelectTrigger><SelectValue placeholder="Pilih akun asal" /></SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1">
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
            </div>
          ) : (
            <>
              <div className="grid gap-1">
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
              <div className="grid gap-1">
                <Label>Kategori (opsional)</Label>
                <Select
                  value={categoryId ?? "__NONE__"}
                  onValueChange={(v) => setCategoryId(v === "__NONE__" ? null : v)}
                >
                  <SelectTrigger><SelectValue placeholder="(Tanpa kategori)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__NONE__">(Tanpa kategori)</SelectItem>
                    {catList.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <div className="grid gap-1">
            <Label>Catatan (opsional)</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Mis: makan siang / gaji / pindah dompet" />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={submit}>Simpan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
