"use client";

import { useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { LogOut, Moon, RefreshCw, Sun } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { logout, refreshFromSheet } from "@/app/actions";
import { NAV, isActive } from "./nav";

export function SiteHeader() {
  const path = usePathname();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [refreshing, startRefresh] = useTransition();
  const title = NAV.find((n) => isActive(n.href, path))?.title ?? "SIP Tracker";

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-4" />
      <h1 className="text-sm font-medium">{title}</h1>
      <div className="ml-auto flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          disabled={refreshing}
          onClick={() =>
            startRefresh(async () => {
              await refreshFromSheet();
              router.refresh();
            })
          }
        >
          <RefreshCw className={refreshing ? "animate-spin" : ""} />
          <span className="hidden sm:inline">{refreshing ? "Refreshing…" : "Refresh"}</span>
        </Button>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Toggle dark mode"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            >
              <Sun className="hidden dark:block" />
              <Moon className="dark:hidden" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Toggle theme</TooltipContent>
        </Tooltip>
        <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-4" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full" aria-label="Account">
              <Avatar className="size-8">
                <AvatarFallback className="text-xs">SB</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Suman Balayar</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => logout()}>
              <LogOut />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
