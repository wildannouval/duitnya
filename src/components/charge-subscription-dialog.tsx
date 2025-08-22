"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { InputCurrency } from "@/components/input-currency";
import { parseCurrencyToInt } from "@/lib/money";
import { toast } from "sonner";

type Freq = "WEEKLY" | "MONTHLY" | "YEARLY";
export type SubRow = {
  id: string;
  name: string;
  amount: number;
  frequency: Freq;
  nextDueDate: string;
  isActive: boolean;
  accountId?: string | null;
};
type Account = { id: string; name: string };

export function ChargeSubscriptionDialog({
  open,
  onOpenChange,
  sub,
  accounts,
  onCharged,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sub: SubRow | null;
  accounts: Account[];
  onCharged?: () => void; // panggil setelah sukses untuk refresh list
}) {
  const [amount, setAmount] = React.useState("0");
  const [date, setDate] = React.useState<string>("");
  const [accountId, setAccountId] = React.useState<string>("");
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open || !sub) return;
    setAmount(String(sub.amount));
    setDate(sub.nextDueDate.slice(0, 10));
    setAccountId(sub.accountId ?? "");
  }, [open, sub]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sub) return;
    const amt = parseCurrencyToInt(amount);
    if (amt <= 0) return toast.error("Nominal harus > 0");
    if (!accountId) return toast.error("Pilih akun");

    setLoading(true);
    try {
      const res = await fetch(`/api/subscriptions/${sub.id}/charge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amt, date, accountId }),
      });
      const j = await res.json();
      if (!res.ok) {
        toast.error(j?.error ?? "Gagal charge");
        return;
      }
      toast.success("Langganan dicatat & due dimajukan");
      onOpenChange(false);
      onCharged?.();
    } catch {
      toast.error("Gagal charge");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !loading && onOpenChange(v)}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Charge langganan</DialogTitle>
        </DialogHeader>

        {sub ? (
          <form onSubmit={onSubmit} className="grid gap-4">
            <div className="text-sm text-muted-foreground">
              {sub.name} · {sub.frequency} · due {sub.nextDueDate.slice(0, 10)}
            </div>

            <div className="grid gap-2">
              <Label>Akun</Label>
              <Select value={accountId} onValueChange={setAccountId}>
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

            <div className="grid gap-2">
              <Label>Nominal (Rp)</Label>
              <InputCurrency value={amount} onValueChange={setAmount} />
            </div>

            <div className="grid gap-2">
              <Label>Tanggal</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                Batal
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Menyimpan…" : "Charge now"}
              </Button>
            </div>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
