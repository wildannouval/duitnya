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

export default function BackupPage() {
  const [file, setFile] = React.useState<File | null>(null);
  const [mode, setMode] = React.useState<"merge" | "replace">("merge");
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<any>(null);

  async function onExport() {
    try {
      const res = await fetch("/api/backup", { cache: "no-store" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(j?.error ?? "Gagal membuat backup");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `duitnya-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Backup terunduh");
    } catch {
      toast.error("Gagal export");
    }
  }

  async function onRestore() {
    if (!file) return toast.error("Pilih file JSON backup dahulu");
    const text = await file.text();
    let parsed: any = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      toast.error("File bukan JSON valid");
      return;
    }
    if (!parsed?.data) {
      toast.error("Format backup tidak dikenal");
      return;
    }
    if (
      mode === "replace" &&
      !confirm("Mode REPLACE akan mengganti semua data sekarang. Lanjutkan?")
    ) {
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/backup/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, data: parsed.data }),
      });
      const j = await res.json();
      if (!res.ok) {
        toast.error(j?.error ?? "Gagal restore");
        setResult(j);
        return;
      }
      toast.success(`Restore ${j.mode} berhasil`);
      setResult(j);
    } catch {
      toast.error("Gagal restore");
    } finally {
      setLoading(false);
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
              <h1 className="text-xl font-semibold">Backup & Restore</h1>
              <p className="text-sm text-muted-foreground">
                Simpan seluruh data sebagai JSON dan pulihkan kapan saja.
              </p>
            </div>

            <div className="grid gap-4 px-4 lg:grid-cols-2 lg:px-6">

              <Card>
                <CardHeader><CardTitle>Export</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Unduh seluruh data kamu dalam satu berkas JSON.
                  </p>
                  <Button onClick={onExport}>Download Backup JSON</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Restore</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-2">
                    <Label>File Backup (.json)</Label>
                    <Input type="file" accept="application/json,.json" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Mode</Label>
                    <div className="flex items-center gap-4 text-sm">
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="radio"
                          name="mode"
                          checked={mode === "merge"}
                          onChange={() => setMode("merge")}
                        />
                        Merge (gabungkan & timpa per-ID)
                      </label>
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="radio"
                          name="mode"
                          checked={mode === "replace"}
                          onChange={() => setMode("replace")}
                        />
                        Replace (hapus semua & isi dari backup)
                      </label>
                    </div>
                  </div>
                  <Button onClick={onRestore} disabled={loading || !file}>
                    {loading ? "Memulihkan…" : "Restore Sekarang"}
                  </Button>
                  {result ? (
                    <pre className="mt-3 max-h-64 overflow-auto rounded bg-muted p-3 text-xs">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  ) : null}
                </CardContent>
              </Card>

            </div>

          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
