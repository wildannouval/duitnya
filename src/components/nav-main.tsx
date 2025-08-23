"use client";

import * as React from "react";
import { type Icon, IconCirclePlusFilled, IconMail } from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { QuickCreateDialog } from "@/components/quick-create-dialog";

type NavItem = {
  title: string;
  url: string;
  icon?: Icon;
};

export function NavMain({ items }: { items: NavItem[] }) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();

  // tandai aktif: path exact atau child (mis. /accounts/123)
  const itemsWithActive = React.useMemo(
    () =>
      items
        .filter((it) => it.url && it.url !== "#") // buang menu yang tidak terpakai
        .map((it) => {
          const isActive =
            pathname === it.url ||
            (it.url !== "/" && pathname.startsWith(it.url + "/"));
          return { ...it, isActive };
        }),
    [items, pathname],
  );

  return (
    <>
      <SidebarGroup>
        <SidebarGroupContent className="flex flex-col gap-2">
          {/* Baris atas: Quick Create + pintasan ke /transactions */}
          <SidebarMenu>
            <SidebarMenuItem className="flex items-center gap-2">
              <SidebarMenuButton
                tooltip="Quick Create"
                className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground min-w-8 duration-200 ease-linear"
                onClick={() => setOpen(true)}
              >
                <IconCirclePlusFilled />
                <span>Quick Create</span>
              </SidebarMenuButton>

              {/* Pintasan ke halaman transaksi (opsional) */}
              <Button
                size="icon"
                className="size-8 group-data-[collapsible=icon]:opacity-0"
                variant="outline"
                asChild
                title="Transactions"
              >
                <Link href="/transactions">
                  <IconMail />
                  <span className="sr-only">Transactions</span>
                </Link>
              </Button>
            </SidebarMenuItem>
          </SidebarMenu>

          {/* Menu utama */}
          <SidebarMenu>
            {itemsWithActive.map((item) => (
              <SidebarMenuItem key={item.title}>
                {/* pakai Link agar <a> dan navigasi jalan; set data-active untuk styling */}
                <SidebarMenuButton asChild data-active={item.isActive} tooltip={item.title}>
                  <Link href={item.url}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      {/* Modal Quick Create */}
      <QuickCreateDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
