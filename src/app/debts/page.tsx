"use client";

import * as React from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { InputCurrency } from "@/components/input-currency";
import { parseCurrencyToInt, formatIDR } from "@/lib/money";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

type DebtKind = "HUTANG" | "PIUTANG";
type DebtStatus = "OPEN" | "PAID";

type Debt = {
  id: string;
  kind: DebtKind;
  counterpartyName: string;
  principalAmount: number;
  remainingAmount: number;
  dueDate?: string | null;
  status: DebtStatus;
  createdAt: string;
};

type Account = { id: string; name: string };

const KIND: DebtKind[] = ["HUTANG", "PIUTANG"];
const STATUS: DebtStatus[] = ["OPEN", "PAID"];

export default function DebtsPage() {
  const [debts, setDebts] = React.useState<Debt[]>([]);
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [loading, setLoading] = React.useState(true);

  // filter
  const [fKind, setFKind] = React.useState<"ALL" | DebtKind>("ALL");
  const [fStatus, setFStatus] = React.useState<"ALL" | DebtStatus>("ALL");

  // form create
  const today = new Date().toISOString().slice(0, 10);
  const [kind, setKind] = React.useState<DebtKind>("HUTANG");
  const [name, setName] = React.useState("");
  const [principal, setPrincipal] = React.useState("0");
  const [due, setDue] = React.useState<string>("");

  // dialog pay
  const [openPay, setOpenPay] = React.useState(false);
  const [active, setActive] = React.useState<Debt | null>(null);
  const [payAmt, setPayAmt] = React.useState("0");
  const [payDate, setPayDate] = React.useState(today);
  const [payAccId, setPayAccId] = React.useState<string>("");

  const fmtDate = (s?: string | null) => (s ? s.slice(0, 10) : "—");
  const daysTo = (d?: string | null) => {
    if (!d) return null;
    const dueDate = new Date(d);
    const now = new Date();
    return Math.ceil((+dueDate - +now) / 86_400_000);
  };
  const dueBadge = (d?: string | null) => {
    if (!d) return <span className="text-xs text-muted-foreground">—</span>;
    const n = daysTo(d)!;
    const label = d.slice(0, 10);
    if (n < 0) return <span className="text-xs text-red-600">Lewat {Math.abs(n)}h · {label}</span>;
    if (n === 0) return <span className="text-xs text-orange-600">Hari ini · {label}</span>;
    return <span className="text-xs text-muted-foreground">Dlm {n}h · {label}</span>;
  };

  async function loadAll() {
    setLoading(true);
    try {
      const [dRes, aRes] = await Promise.all([
        fetch("/api/debts", { cache: "no-store" }),
        fetch("/api/accounts", { cache: "no-store" }),
      ]);
      const [d, a] = await Promise.all([dRes.json(), aRes.json()]);
      setDebts(d);
      setAccounts(a);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    loadAll();
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const principalAmount = parseCurrencyToInt(principal);
    if (!name.trim()) return toast.error("Nama wajib");
    if (principalAmount <= 0) return toast.error("Jumlah harus > 0");

    const body: any = {
      kind,
      counterpartyName: name.trim(),
      principalAmount,
      dueDate: due || undefined,
    };

    const res = await fetch("/api/debts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await res.json();
    if (!res.ok) return toast.error(j?.error ?? "Gagal membuat catatan");
    toast.success("Catatan dibuat");
    setDebts((p) => [j, ...p]);
    setKind("HUTANG");
    setName("");
    setPrincipal("0");
    setDue("");
  }

  async function onDelete(id: string) {
    if (!confirm("Hapus catatan ini?")) return;
    const res = await fetch(`/api/debts/${id}`, { method: "DELETE" });
    const j = await res.json();
    if (!res.ok) return toast.error(j?.error ?? "Gagal menghapus");
    toast.success("Dihapus");
    setDebts((p) => p.filter((x) => x.id !== id));
  }

  async function onToggleStatus(d: Debt) {
    const newStatus: DebtStatus = d.status === "OPEN" ? "PAID" : "OPEN";
    const res = await fetch(`/api/debts/${d.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    const j = await res.json();
    if (!res.ok) return toast.error(j?.error ?? "Gagal update status");
    toast.success("Status diperbarui");
    setDebts((p) => p.map((x) => (x.id === d.id ? j : x)));
  }

  function openPayDialog(d: Debt) {
    setActive(d);
    setPayAmt("0");
    setPayDate(today);
    setPayAccId(accounts[0]?.id ?? "");
    setOpenPay(true);
  }

  async function submitPay(e: React.FormEvent) {
    e.preventDefault();
    if (!active) return;
    const amount = parseCurrencyToInt(payAmt);
    if (amount <= 0) return toast.error("Nominal harus > 0");
    if (!payAccId) return toast.error("Pilih akun");

    const res = await fetch(`/api/debts/${active.id}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, date: payDate, accountId: payAccId }),
    });
    const j = await res.json();
    if (!res.ok) return toast.error(j?.error ?? "Gagal mencatat pembayaran");
    toast.success("Pembayaran dicatat");
    setOpenPay(false);
    setDebts((p) => p.map((x) => (x.id === active.id ? j.debt ?? x : x)));
    // j.debt di backend idealnya mengembalikan debt terkini
  }

  // filter daftar
  const filtered = debts
    .filter((d) => (fKind === "ALL" ? true : d.kind === fKind))
    .filter((d) => (fStatus === "ALL" ? true : d.status === fStatus))
    .sort((a, b) => {
      const da = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      const db = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      return da - db; // paling dekat jatuh tempo di atas
    });

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
            <div className="px-4 lg:px-6 flex items-end justify-between gap-3">
              <div>
                <h1 className="text-xl font-semibold">Hutang · Piutang</h1>
                <p className="text-sm text-muted-foreground">Catat, bayar/terima, dan pantau sisa.</p>
              </div>
              <div className="flex gap-2">
                <div className="grid gap-1">
                  <Label>Filter Jenis</Label>
                  <Select value={fKind} onValueChange={(v) => setFKind(v as any)}>
                    <SelectTrigger className="min-w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">ALL</SelectItem>
                      <SelectItem value="HUTANG">HUTANG</SelectItem>
                      <SelectItem value="PIUTANG">PIUTANG</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1">
                  <Label>Filter Status</Label>
                  <Select value={fStatus} onValueChange={(v) => setFStatus(v as any)}>
                    <SelectTrigger className="min-w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">ALL</SelectItem>
                      <SelectItem value="OPEN">OPEN</SelectItem>
                      <SelectItem value="PAID">PAID</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Form tambah */}
            <div className="grid gap-4 px-4 lg:grid-cols-3 lg:px-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Tambah Catatan</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={onCreate} className="grid gap-4">
                    <div className="grid gap-2">
                      <Label>Jenis</Label>
                      <Select value={kind} onValueChange={(v) => setKind(v as DebtKind)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {KIND.map((k) => (
                            <SelectItem key={k} value={k}>
                              {k}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label>Nama Pihak</Label>
                      <Input
                        placeholder={kind === "HUTANG" ? "Ke siapa kamu berhutang?" : "Siapa yang berhutang padamu?"}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label>Jumlah (Rp)</Label>
                      <InputCurrency value={principal} onValueChange={setPrincipal} />
                    </div>

                    <div className="grid gap-2">
                      <Label>Jatuh Tempo (opsional)</Label>
                      <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
                    </div>

                    <Button type="submit">Simpan</Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Tips</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>
                    Pembayaran akan otomatis membuat transaksi: <b>EXPENSE</b> saat melunasi <b>HUTANG</b>, dan{" "}
                    <b>INCOME</b> saat menerima <b>PIUTANG</b>.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* List */}
            <div className="px-4 lg:px-6">
              <Card>
                <CardHeader>
                  <CardTitle>Daftar</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <p className="text-sm text-muted-foreground">Memuat…</p>
                  ) : filtered.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Belum ada data.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="text-left text-muted-foreground">
                          <tr>
                            <th className="py-2">Jenis</th>
                            <th>Pihak</th>
                            <th>Jumlah Awal</th>
                            <th>Sisa</th>
                            <th>Jatuh Tempo</th>
                            <th>Status</th>
                            <th className="text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map((d) => (
                            <tr key={d.id} className="border-t">
                              <td className="py-2">{d.kind}</td>
                              <td>{d.counterpartyName}</td>
                              <td>{formatIDR(d.principalAmount)}</td>
                              <td className={d.remainingAmount > 0 ? "text-red-600" : ""}>
                                {formatIDR(d.remainingAmount)}
                              </td>
                              <td>{dueBadge(d.dueDate)}</td>
                              <td>{d.status}</td>
                              <td className="text-right space-x-2">
                                <Button size="sm" onClick={() => openPayDialog(d)}>
                                  {d.kind === "HUTANG" ? "Bayar" : "Terima"}
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => onToggleStatus(d)}>
                                  {d.status === "OPEN" ? "Tandai Lunas" : "Buka Lagi"}
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => onDelete(d.id)}>
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

      {/* Dialog Pembayaran */}
      <Dialog open={openPay} onOpenChange={(v) => !loading && setOpenPay(v)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{active?.kind === "HUTANG" ? "Bayar Hutang" : "Terima Piutang"}</DialogTitle>
          </DialogHeader>

          {active ? (
            <form onSubmit={submitPay} className="grid gap-4">
              <div className="text-sm text-muted-foreground">
                {active.counterpartyName} · Sisa {formatIDR(active.remainingAmount)} ·{" "}
                {active.dueDate ? `Due ${fmtDate(active.dueDate)}` : "Tanpa due"}
              </div>

              <div className="grid gap-2">
                <Label>Akun</Label>
                <Select value={payAccId} onValueChange={setPayAccId}>
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
                <InputCurrency value={payAmt} onValueChange={setPayAmt} />
              </div>

              <div className="grid gap-2">
                <Label>Tanggal</Label>
                <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpenPay(false)}>
                  Batal
                </Button>
                <Button type="submit">Simpan</Button>
              </div>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
