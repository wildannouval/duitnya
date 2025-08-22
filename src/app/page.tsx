"use client";

import Link from "next/link";
import {
  IconWallet,
  IconTags,
  IconCreditCard,
  IconBell,
  IconChartBar,
  IconArrowsLeftRight,
} from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Page() {
  return (
    <main className="min-h-screen bg-background">
      {/* HERO */}
      <section className="relative mx-auto max-w-5xl px-4 py-16 md:py-24">
        <div className="text-center space-y-4">
          <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs text-muted-foreground">
            Personal Finance • PWA Ready
          </span>
          <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
            Kelola Keuangan Pribadi dengan Mudah
          </h1>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            Catat saldo di setiap akun, atur budgeting bulanan, transfer antar akun,
            pantau hutang–piutang, dan kelola langganan beserta pengingatnya—semua dalam satu aplikasi.
          </p>

          <div className="mt-6 flex items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/dashboard">Buka Dashboard</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/accounts">Tambah Akun Pertama</Link>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground mt-3">
            Tip: Simpan ke layar utama (Add to Home Screen) untuk pengalaman seperti aplikasi.
          </p>
        </div>
      </section>

      {/* FITUR UTAMA */}
      <section className="mx-auto max-w-6xl px-4 pb-12 md:pb-16">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex-row items-center gap-3">
              <IconWallet className="size-5 text-muted-foreground" />
              <CardTitle>Akun & Saldo</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Simpan banyak akun: Bank, e-Wallet, Dompet. Lihat total saldo dan rincian tiap akun.
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center gap-3">
              <IconTags className="size-5 text-muted-foreground" />
              <CardTitle>Kategori & Budget</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Atur budget bulanan per kategori. Pantau progres dan sisa anggaran.
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center gap-3">
              <IconCreditCard className="size-5 text-muted-foreground" />
              <CardTitle>Transaksi</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Catat pemasukan & pengeluaran harian dengan cepat dan akurat.
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center gap-3">
              <IconArrowsLeftRight className="size-5 text-muted-foreground" />
              <CardTitle>Transfer Antar Akun</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Pindahkan saldo antar akun—otomatis tercatat dua sisi (keluar & masuk).
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center gap-3">
              <IconChartBar className="size-5 text-muted-foreground" />
              <CardTitle>Ringkasan & Laporan</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Lihat cashflow, tren pengeluaran, dan performa budget dalam sekali pandang.
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center gap-3">
              <IconBell className="size-5 text-muted-foreground" />
              <CardTitle>Langganan & Pengingat</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Kelola tagihan langganan dan dapatkan pengingat sebelum jatuh tempo.
            </CardContent>
          </Card>
        </div>
      </section>

      {/* LANGKAH MULAI */}
      <section className="mx-auto max-w-5xl px-4 pb-20">
        <h2 className="text-xl font-semibold mb-4">Mulai dalam 3 langkah</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">1. Tambah Akun</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Buat akun Bank/e-Wallet/Dompet dan isi saldo awal.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">2. Buat Kategori & Budget</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Tentukan kategori pengeluaran dan target budget bulanan.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">3. Catat Transaksi</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Input pemasukan/pengeluaran harian, dan lihat ringkasannya di Dashboard.
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 flex gap-3">
          <Button asChild>
            <Link href="/accounts">Mulai dari Akun</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard">Lihat Dashboard</Link>
          </Button>
        </div>
      </section>

      {/* FOOTER KECIL */}
      <footer className="border-t">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-6 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Keuanganku</span>
          <div className="flex items-center gap-4">
            <Link href="/help" className="hover:underline">
              Bantuan
            </Link>
            <Link href="/settings" className="hover:underline">
              Pengaturan
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
