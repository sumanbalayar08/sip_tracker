import { Suspense } from "react";
import { env } from "@/lib/env";
import { getSheetData } from "@/lib/data";
import { portfolioMetrics, type FundMetrics } from "@/lib/metrics";
import { requireSession } from "@/lib/session";
import { formatNav, formatPct, formatRs, formatUnits, signed } from "@/lib/format";
import { logout, refreshFromSheet } from "./actions";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
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
      </header>
      <Suspense fallback={<p className="text-ink-muted">Loading your portfolio…</p>}>
        <Dashboard />
      </Suspense>
    </main>
  );
}

async function Dashboard() {
  await requireSession();

  const result = await getSheetData();
  if (!result.ok) {
    return (
      <section role="alert" className="rounded-lg border border-bad/40 bg-surface p-5">
        <h2 className="font-semibold text-bad">Couldn&apos;t read your Google Sheet</h2>
        <p className="mt-2 font-mono text-sm break-words text-ink-muted">{result.error}</p>
        <p className="mt-2 text-sm text-ink-muted">
          Check the env vars in <code>.env.local</code> (or Vercel), and that the sheet is shared with the
          service-account email as Editor. Run <code>pnpm sheet:init</code> to create the tabs.
        </p>
      </section>
    );
  }
  const data = result.data;

  const sheetUrl = `https://docs.google.com/spreadsheets/d/${env.sheetId}/edit`;
  const p = portfolioMetrics(data.funds, data.transactions, data.settings.fdRate);
  const recent = [...data.transactions].reverse().slice(0, 8);
  const fundName = new Map(data.funds.map((f) => [f.code, f.name]));

  return (
    <>
      <section aria-label="Portfolio summary" className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-4">
        <Stat label="Current value" value={formatRs(p.value)} />
        <Stat label="Invested" value={formatRs(p.invested)} />
        <Stat
          label="Gain"
          value={signed(formatRs(p.gain), p.gain)}
          sub={formatPct(p.absoluteReturn)}
          tone={p.gain >= 0 ? "good" : "bad"}
        />
        <Stat
          label="XIRR (annual)"
          value={formatPct(p.xirr)}
          sub={<FdPill beats={p.beatsFd} fdRate={p.fdRate} />}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Funds</h2>
        {p.funds.length === 0 ? (
          <Empty sheetUrl={sheetUrl}>No active funds. Add rows to the <b>funds</b> tab.</Empty>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-line bg-surface">
            <table className="num w-full min-w-[720px] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-ink-muted">
                <tr className="border-b border-line">
                  <th className="px-4 py-2 font-medium">Fund</th>
                  <th className="px-4 py-2 text-right font-medium">Units</th>
                  <th className="px-4 py-2 text-right font-medium">NAV</th>
                  <th className="px-4 py-2 text-right font-medium">Invested</th>
                  <th className="px-4 py-2 text-right font-medium">Value</th>
                  <th className="px-4 py-2 text-right font-medium">Gain</th>
                  <th className="px-4 py-2 text-right font-medium">XIRR</th>
                </tr>
              </thead>
              <tbody>
                {p.funds.map((m) => (
                  <FundRow key={m.fund.code} m={m} fdRate={p.fdRate} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold">Recent transactions</h2>
          <a href={sheetUrl} target="_blank" rel="noreferrer" className="text-sm text-accent hover:underline">
            Open sheet ↗
          </a>
        </div>
        {data.skippedRows > 0 && (
          <p className="text-sm text-bad">
            {data.skippedRows} row(s) in the transactions tab were skipped: each needs fund_code, date, a type
            (SIP, DIV_CASH, DIV_REINVEST, REDEEM) and amount.
          </p>
        )}
        {recent.length === 0 ? (
          <Empty sheetUrl={sheetUrl}>
            No transactions yet. Add your SIP instalments to the <b>transactions</b> tab, one row each, then press
            Refresh.
          </Empty>
        ) : (
          <ul className="divide-y divide-line rounded-lg border border-line bg-surface text-sm">
            {recent.map((t, i) => (
              <li key={t.id || i} className="num flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2.5">
                <span className="text-ink-muted">{t.date}</span>
                <span className="min-w-0 flex-1 truncate">{fundName.get(t.fundCode) ?? t.fundCode}</span>
                <span className="rounded bg-bg px-1.5 py-0.5 text-xs text-ink-muted">{t.type}</span>
                <span className="w-28 text-right">{formatRs(t.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: React.ReactNode;
  tone?: "good" | "bad";
}) {
  return (
    <div className="flex flex-col gap-1 bg-surface p-4">
      <span className="text-xs uppercase tracking-wide text-ink-muted">{label}</span>
      <span className={`num text-xl font-semibold ${tone === "good" ? "text-good" : tone === "bad" ? "text-bad" : ""}`}>
        {value}
      </span>
      {sub && <span className="num text-sm text-ink-muted">{sub}</span>}
    </div>
  );
}

function FdPill({ beats, fdRate }: { beats: boolean | null; fdRate: number }) {
  if (beats === null) return <span>FD {formatPct(fdRate)}</span>;
  return (
    <span className={beats ? "text-good" : "text-bad"}>
      {beats ? "▲ Beats" : "▼ Below"} FD {formatPct(fdRate)}
    </span>
  );
}

function FundRow({ m, fdRate }: { m: FundMetrics; fdRate: number }) {
  return (
    <tr className="border-b border-line last:border-0">
      <td className="px-4 py-3">
        <div className="font-medium">{m.fund.name || m.fund.code}</div>
        <div className="text-xs text-ink-muted">
          {m.fund.code}
          {m.firstDate && ` · since ${m.firstDate}`}
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        {formatUnits(m.units)}
        {m.unitsSource === "transactions" && m.units > 0 && (
          <div className="text-xs text-ink-muted">from transactions</div>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        {formatNav(m.fund.currentNav)}
        <div className="text-xs text-ink-muted">{m.fund.navDate || "no date"}</div>
      </td>
      <td className="px-4 py-3 text-right">{formatRs(m.invested)}</td>
      <td className="px-4 py-3 text-right">{formatRs(m.value)}</td>
      <td className={`px-4 py-3 text-right ${m.gain >= 0 ? "text-good" : "text-bad"}`}>
        {signed(formatRs(m.gain), m.gain)}
        <div className="text-xs">{formatPct(m.absoluteReturn)}</div>
      </td>
      <td className="px-4 py-3 text-right">
        {formatPct(m.xirr)}
        <div className="text-xs">
          <FdPill beats={m.beatsFd} fdRate={fdRate} />
        </div>
      </td>
    </tr>
  );
}

function Empty({ children, sheetUrl }: { children: React.ReactNode; sheetUrl: string }) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-surface p-5 text-sm text-ink-muted">
      <p>{children}</p>
      <a href={sheetUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-accent hover:underline">
        Open sheet ↗
      </a>
    </div>
  );
}
