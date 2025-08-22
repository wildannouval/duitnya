"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { InputCurrency } from "@/components/input-currency";
import { parseCurrencyToInt } from "@/lib/money";
import { toast } from "sonner";

type Account = { id: string; name: string };
type Category = { id: string; name: string; type: "INCOME" | "EXPENSE" };

const NONE = "__none__";

export function QuickCreate({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);

  const [tab, setTab] = React.useState<"EXPENSE" | "INCOME" | "TRANSFER">("EXPENSE");
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [loading, setLoading] = React.useState(false);

  // form states
  const [amount, setAmount] = React.useState("0");
  const [date, setDate] = React.useState(today);
  const [accountId, setAccountId] = React.useState<string>(NONE);
  const [categoryId, setCategoryId] = React.useState<string>(NONE);
  const [note, setNote] = React.useState("");

  // transfer states
  const [tAmount, setTAmount] = React.useState("0");
  const [tDate, setTDate] = React.useState(today);
  const [fromId, setFromId] = React.useState<string>(NONE);
  const [toId, setToId] = React.useState<string>(NONE);
  const [tNote, setTNote] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    (async () => {
      const [aRes, cRes] = await Promise.all([
        fetch("/api/accounts", { cache: "no-store" }),
        fetch("/api/categories", { cache: "no-store" }),
      ]);
      const [a, c] = await Promise.all([aRes.json(), cRes.json()]);
      setAccounts(a);
      setCategories(c);
      // default pilih akun pertama bila ada
      setAccountId(a[0]?.id ?? NONE);
      setFromId(a[0]?.id ?? NONE);
      setToId(a[1]?.id ?? NONE);
    })();
  }, [open]);

  function resetAll() {
    setAmount("0");
    setDate(today);
    setAccountId(accounts[0]?.id ?? NONE);
    setCategoryId(NONE);
    setNote("");
    setTAmount("0");
    setTDate(today);
    setFromId(accounts[0]?.id ?? NONE);
    setToId(accounts[1]?.id ?? NONE);
    setTNote("");
  }

  async function submitIncomeExpense(type: "INCOME" | "EXPENSE") {
    const amt = parseCurrencyToInt(amount);
    if (amt <= 0) return toast.error("Nominal harus > 0");
    if (accountId === NONE) return toast.error("Pilih akun dulu");

    setLoading(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          amount: amt,
          date,
          accountId,
          categoryId: categoryId === NONE ? undefined : categoryId,
          note: note || undefined,
        }),
      });
      const j = await res.json();
      if (!res.ok) return toast.error(j?.error ?? "Gagal menyimpan");
      toast.success(`${type === "INCOME" ? "Income" : "Expense"} tersimpan`);
      onCreated?.();
      onOpenChange(false);
      resetAll();
    } catch {
      toast.error("Gagal menyimpan");
    } finally {
      setLoading(false);
    }
  }

  async function submitTransfer() {
    const amt = parseCurrencyToInt(tAmount);
    if (amt <= 0) return toast.error("Nominal harus > 0");
    if (fromId === NONE || toId === NONE) return toast.error("Pilih akun sumber & tujuan");
    if (fromId === toId) return toast.error("Akun sumber & tujuan tidak boleh sama");

    setLoading(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "TRANSFER",
          amount: amt,
          date: tDate,
          fromAccountId: fromId,
          toAccountId: toId,
          note: tNote || undefined,
        }),
      });
      const j = await res.json();
      if (!res.ok) return toast.error(j?.error ?? "Gagal transfer");
      toast.success("Transfer tersimpan");
      onCreated?.();
      onOpenChange(false);
      resetAll();
    } catch {
      toast.error("Gagal transfer");
    } finally {
      setLoading(false);
    }
  }

  const incomeCats = categories.filter((c) => c.type === "INCOME");
  const expenseCats = categories.filter((c) => c.type === "EXPENSE");

  return (
    <Dialog open={open} onOpenChange={(v) => !loading && onOpenChange(v)}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Quick Create</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="EXPENSE" className="flex-1">Expense</TabsTrigger>
            <TabsTrigger value="INCOME" className="flex-1">Income</TabsTrigger>
            <TabsTrigger value="TRANSFER" className="flex-1">Transfer</TabsTrigger>
          </TabsList>

          {/* EXPENSE */}
          <TabsContent value="EXPENSE" className="mt-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Nominal (Rp)</Label>
                <InputCurrency value={amount} onValueChange={setAmount} />
              </div>
              <div className="grid gap-2">
                <Label>Akun</Label>
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger><SelectValue placeholder="Pilih akun" /></SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Kategori (opsional)</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>—</SelectItem>
                    {expenseCats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Tanggal</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Catatan (opsional)</Label>
                <Input placeholder="contoh: makan siang" value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Batal</Button>
                <Button onClick={() => submitIncomeExpense("EXPENSE")} disabled={loading}>
                  {loading ? "Menyimpan…" : "Simpan"}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* INCOME */}
          <TabsContent value="INCOME" className="mt-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Nominal (Rp)</Label>
                <InputCurrency value={amount} onValueChange={setAmount} />
              </div>
              <div className="grid gap-2">
                <Label>Akun</Label>
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger><SelectValue placeholder="Pilih akun" /></SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Kategori (opsional)</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>—</SelectItem>
                    {incomeCats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Tanggal</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Catatan (opsional)</Label>
                <Input placeholder="contoh: gaji" value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Batal</Button>
                <Button onClick={() => submitIncomeExpense("INCOME")} disabled={loading}>
                  {loading ? "Menyimpan…" : "Simpan"}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* TRANSFER */}
          <TabsContent value="TRANSFER" className="mt-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Nominal (Rp)</Label>
                <InputCurrency value={tAmount} onValueChange={setTAmount} />
              </div>
              <div className="grid gap-2">
                <Label>Dari Akun</Label>
                <Select value={fromId} onValueChange={setFromId}>
                  <SelectTrigger><SelectValue placeholder="Pilih akun sumber" /></SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Ke Akun</Label>
                <Select value={toId} onValueChange={setToId}>
                  <SelectTrigger><SelectValue placeholder="Pilih akun tujuan" /></SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Tanggal</Label>
                <Input type="date" value={tDate} onChange={(e) => setTDate(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Catatan (opsional)</Label>
                <Input placeholder="contoh: pindah ke tabungan" value={tNote} onChange={(e) => setTNote(e.target.value)} />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Batal</Button>
                <Button onClick={submitTransfer} disabled={loading}>
                  {loading ? "Menyimpan…" : "Simpan"}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
