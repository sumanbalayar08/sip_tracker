"use client";

import { useState } from "react";
import type { Dividend, Fund, NavPoint, Transaction } from "@/lib/schema";
import { portfolioMetrics } from "@/lib/metrics";
import { simulate } from "@/lib/whatif";
import { formatPct, formatRs, signed } from "@/lib/format";

type Props = {
  funds: Fund[];
  transactions: Transaction[];
  navHistory: Record<string, NavPoint[]>;
  dividends: Dividend[];
  fdRate: number;
};

export function WhatIf({ funds, transactions, navHistory, dividends, fdRate }: Props) {
  const holdings = funds.filter((f) => f.active);
  const [scope, setScope] = useState<string>("ALL");

  const scopedFunds = scope === "ALL" ? holdings : holdings.filter((f) => f.code === scope);
  const scopedTx = transactions.filter((t) => scopedFunds.some((f) => f.code === t.fundCode));
  const actual = portfolioMetrics(scopedFunds, scopedTx, fdRate);

  // "Ends with" = everything the money turned into: current value + dividends + anything redeemed.
  const trades = scopedTx.filter((t) => t.type === "SIP" || t.type === "REDEEM");
  const rows = funds
      .filter((f) => (navHistory[f.code]?.length ?? 0) > 0)
      .map((f) => ({
        fund: f,
        r: simulate(
          trades,
          navHistory[f.code],
          dividends.filter((d) => d.fundCode === f.code),
        ),
      }))
    .map((x) => ({ ...x, total: x.r.gain + x.r.invested }))
    .sort(
      (a, b) =>
        Number(b.r.missingDates.length === 0) - Number(a.r.missingDates.length === 0) || b.total - a.total,
    );

  const actualTotal = actual.gain + actual.invested;
  const firstDate = scopedTx[0]?.date;
  const noNav = funds.filter((f) => !navHistory[f.code]?.length);

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">What if you&apos;d picked a different fund?</h2>
        <p className="max-w-prose text-sm text-ink-muted">
          Each row puts the same amounts on the same dates as your SIPs into that fund instead, at its NAV on that date
          (the last month-end NAV in <b>nav_history</b> when the exact day isn&apos;t there). Cash dividends from the{" "}
          <b>dividends</b> tab count as money received.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <label htmlFor="scope" className="text-ink-muted">
            Replay
          </label>
          <select
            id="scope"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            className="rounded-md border border-line bg-surface px-3 py-1.5"
          >
            <option value="ALL">All my SIPs</option>
            {holdings.map((f) => (
              <option key={f.code} value={f.code}>
                My {f.name || f.code} SIPs
              </option>
            ))}
          </select>
          {firstDate && (
            <span className="num text-ink-muted">
              {scopedTx.filter((t) => t.type === "SIP").length} SIPs, {formatRs(actual.invested)}, since {firstDate}
            </span>
          )}
        </div>
      </section>

      {scopedTx.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line bg-surface p-5 text-sm text-ink-muted">
          No SIPs to replay yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="num w-full min-w-[680px] text-sm whitespace-nowrap">
            <thead className="text-left text-xs uppercase tracking-wide text-ink-muted">
              <tr className="border-b border-line">
                <th className="px-4 py-2 font-medium">Fund</th>
                <th className="px-4 py-2 text-right font-medium">Ends with</th>
                <th className="px-4 py-2 text-right font-medium">Gain</th>
                <th className="px-4 py-2 text-right font-medium">XIRR</th>
                <th className="px-4 py-2 text-right font-medium">vs yours</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-line bg-bg/60">
                <td className="px-4 py-3">
                  <div className="font-medium">Your actual portfolio</div>
                  <div className="text-xs text-ink-muted">real purchase NAVs, current units and dividends you recorded</div>
                </td>
                <td className="px-4 py-3 text-right font-medium">{formatRs(actualTotal)}</td>
                <GainCells gain={actual.gain} pct={actual.absoluteReturn} xirr={actual.xirr} />
                <td className="px-4 py-3 text-right text-ink-muted">–</td>
              </tr>
              {rows.map(({ fund, r, total }) => {
                const diff = total - actualTotal;
                const incomplete = r.missingDates.length > 0;
                return (
                  <tr key={fund.code} className={`border-b border-line last:border-0 ${incomplete ? "opacity-60" : ""}`}>
                    <td className="px-4 py-3 whitespace-normal">
                      <div className="flex items-center gap-2 font-medium">
                        {fund.name || fund.code}
                        {fund.active && (
                          <span className="rounded bg-bg px-1.5 py-0.5 text-[11px] font-normal text-ink-muted">you hold</span>
                        )}
                      </div>
                      <div className="text-xs text-ink-muted">
                        {fund.code}
                        {r.latest && ` · NAV ${r.latest.nav.toFixed(2)} on ${r.latest.date}`}
                        {r.cashDividends > 0 && ` · ${formatRs(r.cashDividends)} dividends`}
                      </div>
                      {incomplete && (
                        <div className="text-xs text-bad">
                          No NAV for {r.missingDates.length} SIP date(s) — add NAVs to nav_history
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">{formatRs(total)}</td>
                    <GainCells gain={r.gain} pct={r.invested ? r.gain / r.invested : null} xirr={r.xirr} />
                    <td className={`px-4 py-3 text-right ${diff >= 0 ? "text-good" : "text-bad"}`}>
                      {incomplete ? "–" : signed(formatRs(diff), diff)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ul className="flex max-w-prose list-disc flex-col gap-1 pl-5 text-sm text-ink-muted">
        <li>
          NAVs are monthly, so a replayed purchase can be a few days off its real price. Results are a guide, not exact.
        </li>
        <li>
          If a fund you hold shows more here than your actual row, check its tab for a missing <b>DIV_CASH</b> dividend.
        </li>
        <li>
          To compare another fund, add it to the <b>funds</b> tab with active = FALSE, and its month-end NAVs to{" "}
          <b>nav_history</b> (dividends to <b>dividends</b>).
        </li>
        {noNav.length > 0 && <li>No NAV history yet for: {noNav.map((f) => f.code).join(", ")}.</li>}
      </ul>
    </div>
  );
}

function GainCells({ gain, pct, xirr }: { gain: number; pct: number | null; xirr: number | null }) {
  return (
    <>
      <td className={`px-4 py-3 text-right ${gain >= 0 ? "text-good" : "text-bad"}`}>
        {signed(formatRs(gain), gain)}
        <div className="text-xs">{formatPct(pct)}</div>
      </td>
      <td className="px-4 py-3 text-right">{formatPct(xirr)}</td>
    </>
  );
}
