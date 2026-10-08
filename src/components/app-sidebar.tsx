"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink, Sheet as SheetIcon, Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { NAV, isActive } from "./nav";

export function AppSidebar({ sheetUrl, ...props }: React.ComponentProps<typeof Sidebar> & { sheetUrl: string | null }) {
  const path = usePathname();
  return (
    <Sidebar collapsible="icon" variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Sprout className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">SIP Tracker</span>
                  <span className="truncate text-xs text-muted-foreground">Mutual funds · Nepal</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Portfolio</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={isActive(item.href, path)} tooltip={item.title}>
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {sheetUrl && (
          <SidebarGroup>
            <SidebarGroupLabel>Data</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Google Sheet">
                    <a href={sheetUrl} target="_blank" rel="noreferrer">
                      <SheetIcon />
                      <span>Google Sheet</span>
                      <ExternalLink className="ml-auto size-3.5 text-muted-foreground" />
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="group-data-[collapsible=icon]:hidden">
        <div className="rounded-lg border bg-background p-3 text-sm shadow-xs">
          <p className="font-medium">Your data lives in the sheet</p>
          <p className="mt-1 text-muted-foreground">
            Add SIPs to each fund&apos;s tab, update NAVs monthly, then refresh.
          </p>
          {sheetUrl && (
            <Button asChild size="sm" className="mt-3 w-full">
              <a href={sheetUrl} target="_blank" rel="noreferrer">
                Open Google Sheet
              </a>
            </Button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
