"use client";

import * as React from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type Row = {
  type: string;
  date: string;
  amount: string;
  account?: string;
  category?: string;
  note?: string;
  fromAccount?: string;
  toAccount?: string;
};

type Item = {
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  date: string; // YYYY-MM-DD
  amount: number; // positive
  accountName?: string;
  categoryName?: string | null;
  note?: string | null;
  fromAccountName?: string;
  toAccountName?: string;
};

function csvParse(text: string): Row[] {
  // Parser CSV sederhana yang support kutip ganda
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(Boolean);
  if (lines.length === 0) return [];
  const head = splitCSVLine(lines[0]).map((h) => h.trim().toLowerCase());
  const rows: Row[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i]);
    const row: any = {};
    head.forEach((h, idx) => (row[h] = (cols[idx] ?? "").trim()));
    rows.push(row as Row);
  }
  return rows;
}

function splitCSVLine(line: string): string[] {
  const res: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        res.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
  }
  res.push(cur);
  return res;
}

export default function ImportPage() {
  const [text, setText] = React.useState<string>("");
  const [rows, setRows] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [createAccounts, setCreateAccounts] = React.useState(true);
  const [createCategories, setCreateCategories] = React.useState(false);

  function onPasteSample() {
    const sample = [
      'type,date,amount,account,category,note,fromAccount,toAccount',
      'INCOME,2025-08-01,5000000,BCA,Gaji,"Gaji Agustus",,',
      'EXPENSE,2025-08-02,150000,BCA,Makan,"Makan siang",,',
      'TRANSFER,2025-08-03,200000,,,"Pindah ke tabungan",BCA,Tabungan',
    ].join("\n");
    setText(sample);
    setRows(csvParse(sample));
  }

  function onTextChange(v: string) {
    setText(v);
    setRows(csvParse(v));
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const t = String(reader.result || "");
      setText(t);
      setRows(csvParse(t));
    };
    reader.readAsText(f, "utf-8");
  }

  function toItems(): Item[] {
    return rows.map((r) => {
      const type = (r.type || "").toUpperCase() as Item["type"];
      const amountNum = Math.abs(Number(r.amount || 0));
      const clean = {
        type,
        date: r.date,
        amount: Number.isFinite(amountNum) ? Math.round(amountNum) : 0,
        accountName: r.account?.trim() || undefined,
        categoryName: (r.category?.trim() || "") || null,
        note: (r.note?.trim() || "") || null,
        fromAccountName: r.fromAccount?.trim() || undefined,
        toAccountName: r.toAccount?.trim() || undefined,
      } as Item;
      return clean;
    });
  }

  async function onImport() {
    const items = toItems().filter((i) => i.type && i.date && i.amount > 0);
    if (items.length === 0) return toast.error("Tidak ada baris valid");
    setLoading(true);
    try {
      const res = await fetch("/api/import/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          createMissingAccounts: createAccounts,
          createMissingCategories: createCategories,
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        toast.error(j?.error ?? "Import gagal");
        return;
      }
      const errCount = (j.errors?.length ?? 0) as number;
      if (errCount > 0) {
        toast.warning(`Berhasil: ${j.created}, Gagal: ${errCount}. Cek detail di bawah.`);
      } else {
        toast.success(`Import sukses: ${j.created} transaksi dibuat`);
      }
      // tampilkan hasil error di bawah (state rows tetap untuk referensi)
      setResult(j);
    } catch {
      toast.error("Import gagal");
    } finally {
      setLoading(false);
    }
  }

  const [result, setResult] = React.useState<{ created?: number; errors?: { index: number; message: string }[] } | null>(null);

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
              <h1 className="text-xl font-semibold">Import CSV Transaksi</h1>
              <p className="text-sm text-muted-foreground">
                Format kolom: <code>type</code>, <code>date</code>, <code>amount</code>, <code>account</code>, <code>category</code>, <code>note</code>, <code>fromAccount</code>, <code>toAccount</code>
              </p>
            </div>

            <div className="grid gap-4 px-4 lg:grid-cols-3 lg:px-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Upload / Paste CSV</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <Label>Upload file</Label>
                    <Input type="file" accept=".csv,text/csv" onChange={onFile} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Atau paste di sini</Label>
                    <textarea
                      value={text}
                      onChange={(e) => onTextChange(e.target.value)}
                      rows={10}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-hidden ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      placeholder={`type,date,amount,account,category,note,fromAccount,toAccount\nEXPENSE,2025-08-02,150000,BCA,Makan,"Makan siang",,\nTRANSFER,2025-08-03,200000,,,,"BCA","Tabungan"`}
                    />
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" onClick={onPasteSample}>Paste contoh</Button>
                      <Button type="button" onClick={onImport} disabled={loading || rows.length === 0}>
                        {loading ? "Mengimpor…" : "Import sekarang"}
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label>Opsi</Label>
                    <div className="flex items-center gap-3 text-sm">
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={createAccounts}
                          onChange={(e) => setCreateAccounts(e.target.checked)}
                        />
                        Buat akun jika belum ada
                      </label>
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={createCategories}
                          onChange={(e) => setCreateCategories(e.target.checked)}
                        />
                        Buat kategori jika belum ada
                      </label>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Petunjuk singkat</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <ul className="list-disc pl-5 space-y-1">
                    <li><b>INCOME/EXPENSE</b>: isi <code>account</code>. <code>category</code> opsional.</li>
                    <li><b>TRANSFER</b>: isi <code>fromAccount</code> & <code>toAccount</code>. Kosongkan <code>account</code>.</li>
                    <li><code>amount</code> angka <i>positif</i>. Tanda minus tidak wajib.</li>
                    <li>Centang opsi untuk otomatis membuat akun/kategori yang belum ada.</li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Preview */}
            <div className="px-4 lg:px-6">
              <Card>
                <CardHeader>
                  <CardTitle>Preview ({rows.length} baris)</CardTitle>
                </CardHeader>
                <CardContent>
                  {rows.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Belum ada data.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="text-left text-muted-foreground">
                          <tr>
                            <th className="py-2">type</th>
                            <th>date</th>
                            <th className="text-right">amount</th>
                            <th>account</th>
                            <th>category</th>
                            <th>fromAccount</th>
                            <th>toAccount</th>
                            <th>note</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.slice(0, 20).map((r, idx) => (
                            <tr key={idx} className="border-t">
                              <td className="py-2">{r.type}</td>
                              <td>{r.date}</td>
                              <td className="text-right">{r.amount}</td>
                              <td>{r.account ?? ""}</td>
                              <td>{r.category ?? ""}</td>
                              <td>{r.fromAccount ?? ""}</td>
                              <td>{r.toAccount ?? ""}</td>
                              <td className="max-w-[320px] truncate">{r.note ?? ""}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {rows.length > 20 ? (
                        <p className="text-xs text-muted-foreground mt-2">Menampilkan 20 baris pertama…</p>
                      ) : null}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Hasil impor */}
            {result ? (
              <div className="px-4 lg:px-6">
                <Card>
                  <CardHeader><CardTitle>Hasil Import</CardTitle></CardHeader>
                  <CardContent className="text-sm">
                    <p className="mb-2">Berhasil dibuat: <b>{result.created ?? 0}</b></p>
                    {(result.errors?.length ?? 0) > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="text-left text-muted-foreground">
                            <tr>
                              <th className="py-2"># Index baris</th>
                              <th>Kesalahan</th>
                            </tr>
                          </thead>
                          <tbody>
                            {result.errors!.map((e, i) => (
                              <tr key={i} className="border-t">
                                <td className="py-2">{e.index + 2 /* + header */}</td>
                                <td>{e.message}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Tidak ada error.</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : null}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
