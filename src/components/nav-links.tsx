"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Overview" },
  { href: "/projection", label: "Projection" },
  { href: "/compare", label: "Compare" },
] as const;

export function NavLinks() {
  const path = usePathname();
  return (
    <nav aria-label="Sections" className="flex gap-1 text-sm">
      {LINKS.map((l) => {
        const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-md px-3 py-1.5 ${active ? "bg-surface font-medium text-ink shadow-sm ring-1 ring-line" : "text-ink-muted hover:text-ink"}`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
