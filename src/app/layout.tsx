import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { ServiceWorkerRegister } from "@/components/sw-register";

export const metadata: Metadata = {
  title: {
    default: "Duitnya",
    template: "%s · Duitnya",
  },
  description:
    "Aplikasi manajemen keuangan pribadi: akun, transaksi, budget, hutang–piutang, dan langganan.",
  applicationName: "Duitnya",
  // pastikan file ini ada di /public/manifest.json
  manifest: "/manifest.json",
  // pastikan file-file PNG ini ada di /public/icons/
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-192.png" },
      { url: "/icons/icon-512.png" },
    ],
  },
  themeColor: "#111827", // sesuaikan warna tema PWA
};

export const viewport: Viewport = {
  themeColor: "#111827",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className="antialiased min-h-screen bg-background text-foreground">
        {children}
        <Toaster richColors closeButton />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
