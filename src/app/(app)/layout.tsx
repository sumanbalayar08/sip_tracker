import { NavLinks } from "@/components/nav-links";
import { logout, refreshFromSheet } from "../actions";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">SIP Tracker</h1>
          <div className="flex items-center gap-2 text-sm">
            <form action={refreshFromSheet}>
              <button className="rounded-md border border-line bg-surface px-3 py-1.5 hover:border-accent">
                Refresh from sheet
              </button>
            </form>
            <form action={logout}>
              <button className="rounded-md px-3 py-1.5 text-ink-muted hover:text-ink">Sign out</button>
            </form>
          </div>
        </div>
        <NavLinks />
      </header>
      {children}
    </main>
  );
}
