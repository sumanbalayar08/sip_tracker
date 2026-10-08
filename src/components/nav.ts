import { ArrowLeftRight, ChartLine, LayoutDashboard, Scale, type LucideIcon } from "lucide-react";

export type NavItem = { href: string; title: string; icon: LucideIcon };

export const NAV: NavItem[] = [
  { href: "/", title: "Overview", icon: LayoutDashboard },
  { href: "/transactions", title: "Transactions", icon: ArrowLeftRight },
  { href: "/projection", title: "Projection", icon: ChartLine },
  { href: "/compare", title: "Compare funds", icon: Scale },
];

export const isActive = (href: string, path: string) => (href === "/" ? path === "/" : path.startsWith(href));
