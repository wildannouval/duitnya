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
  IconFileImport,
  IconArchive,
} from "@tabler/icons-react";
import { usePathname } from "next/navigation";

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

// menu utama aplikasi
const navMainBase = [
  { title: "Dashboard",      url: "/dashboard",     icon: IconDashboard },
  { title: "Akun",           url: "/accounts",      icon: IconWallet },
  { title: "Kategori",       url: "/categories",    icon: IconTags },
  { title: "Transaksi",      url: "/transactions",  icon: IconCreditCard },
  { title: "Budget",         url: "/budget",        icon: IconChartBar },
  { title: "Hutang–Piutang", url: "/debts",         icon: IconUserDollar },
  { title: "Langganan",      url: "/subscriptions", icon: IconBell },
];

// menu sekunder + IMPORT
const navSecondaryBase = [
  { title: "Import",   url: "/import",   icon: IconFileImport },
  { title: "Backup",   url: "/backup",   icon: IconArchive },
  { title: "Settings", url: "/settings", icon: IconSettings },
  { title: "Get Help", url: "/help",     icon: IconHelp },
  { title: "Search",   url: "/search",   icon: IconSearch },
];

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();

  // tandai aktif bila diperlukan (opsional, aman walau NavMain/NavSecondary tak pakai isActive)
  const navMain = React.useMemo(
    () =>
      navMainBase.map((it) => ({
        ...it,
        isActive:
          pathname === it.url ||
          (it.url !== "/" && pathname.startsWith(it.url + "/")),
      })),
    [pathname]
  );

  const navSecondary = React.useMemo(
    () =>
      navSecondaryBase.map((it) => ({
        ...it,
        isActive:
          pathname === it.url ||
          (it.url !== "/" && pathname.startsWith(it.url + "/")),
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
        <NavMain items={navMain} />
        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
