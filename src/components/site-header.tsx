"use client";

import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { InstallPWAButton } from "@/components/install-pwa-button";

// peta path -> judul halaman
const TITLES: Record<string, string> = {
  "/": "Welcome",
  "/dashboard": "Dashboard",
  "/accounts": "Akun",
  "/categories": "Kategori",
  "/transactions": "Transaksi",
  "/budget": "Budget",
  "/debts": "Hutang & Piutang",
  "/subscriptions": "Langganan",
  "/settings": "Settings",
  "/help": "Bantuan",
  "/search": "Pencarian",
};

function resolveTitle(pathname: string) {
  // cocokkan yang paling panjang dulu (untuk rute bercabang)
  const keys = Object.keys(TITLES).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    if (pathname === k || pathname.startsWith(k + "/")) return TITLES[k];
  }
  return "Duitnya";
}

export function SiteHeader() {
  const pathname = usePathname();
  const title = resolveTitle(pathname);

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
        <h1 className="text-base font-medium">{title}</h1>

        {/* kosongkan kanan, kalau perlu tombol lain tinggal taruh di sini */}
        <div className="ml-auto flex items-center gap-2">
          {/* contoh: tombol ke repo kamu (opsional) */}
          {/* <Button variant="ghost" asChild size="sm" className="hidden sm:flex">
            <a href="https://github.com/username/duitnya" rel="noopener noreferrer" target="_blank" className="dark:text-foreground">
              GitHub
            </a>
          </Button> */}
          <InstallPWAButton />
        </div>
      </div>
    </header>
  );
}
