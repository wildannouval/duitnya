"use client";

import * as React from "react";
import {
  IconDashboard,
  IconWallet,
  IconTags,
  IconCreditCard,
  IconChartBar,
  IconUserDollar,
  IconBell,
  IconSettings,
  IconHelp,
  IconSearch,
  IconInnerShadowTop,
} from "@tabler/icons-react";
import { usePathname } from "next/navigation";

// ⚠️ PENTING: sesuaikan path ini dengan struktur projekmu.
// Kalau file kamu ada di "components/ui", ganti jadi "@/components/ui/nav-main" dan seterusnya.
import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const user = {
  name: "User",
  email: "you@example.com",
  avatar: "/favicon.ico",
};

// Menu utama (ISI KEDUA PROPERTI: url & href)
const navMainBase = [
  { title: "Dashboard",      url: "/dashboard",     href: "/dashboard",     icon: IconDashboard },
  { title: "Akun",           url: "/accounts",      href: "/accounts",      icon: IconWallet },
  { title: "Kategori",       url: "/categories",    href: "/categories",    icon: IconTags },
  { title: "Transaksi",      url: "/transactions",  href: "/transactions",  icon: IconCreditCard },
  { title: "Budget",         url: "/budget",        href: "/budget",        icon: IconChartBar },
  { title: "Hutang–Piutang", url: "/debts",         href: "/debts",         icon: IconUserDollar },
  { title: "Langganan",      url: "/subscriptions", href: "/subscriptions", icon: IconBell },
];

// Menu sekunder (boleh tetap pakai "url" saja, karena memang jalan)
const navSecondary = [
  { title: "Settings", url: "/settings", icon: IconSettings },
  { title: "Get Help", url: "/help",     icon: IconHelp },
  { title: "Search",   url: "/search",   icon: IconSearch },
];

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();

  const navMain = React.useMemo(
    () =>
      navMainBase.map((it) => ({
        ...it,
        isActive:
          pathname === it.href ||
          pathname === it.url ||
          (it.href && it.href !== "/" && pathname.startsWith(it.href + "/")) ||
          (it.url  && it.url  !== "/" && pathname.startsWith(it.url  + "/")),
      })),
    [pathname]
  );

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:!p-1.5">
              <a href="/dashboard" aria-label="Keuanganku">
                <IconInnerShadowTop className="!size-5" />
                <span className="text-base font-semibold">Keuanganku</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={navMain as any} />
        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
