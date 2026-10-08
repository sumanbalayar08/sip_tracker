import type { Dividend, NavPoint, Transaction } from "./schema";
import { isoToUtcDate } from "./parse";
import { xirr, type CashFlow } from "./xirr";

const DAY = 86_400_000;
const FACE_VALUE = 10; // Nepali mutual fund units are Rs 10 face value

/**
 * NAV to use for a trade on `date`: the latest NAV on or before it, or — if
 * the history starts later — the first one within `maxGapDays` after it.
 */
export function navOn(points: NavPoint[], date: string, maxGapDays = 45): NavPoint | null {
  let before: NavPoint | null = null;
  for (const p of points) {
    if (p.date <= date) before = p;
    else {
      if (before) return before;
      const gap = (isoToUtcDate(p.date).getTime() - isoToUtcDate(date).getTime()) / DAY;
      return gap <= maxGapDays ? p : null;
    }
  }
  if (!before) return null;
  const stale = (isoToUtcDate(date).getTime() - isoToUtcDate(before.date).getTime()) / DAY;
  return stale <= maxGapDays ? before : null;
}

export type WhatIfResult = {
  invested: number;
  units: number;
  cashDividends: number;
  value: number;
  gain: number;
  xirr: number | null;
  latest: NavPoint | null;
  missingDates: string[]; // SIP dates with no usable NAV (those SIPs are left out)
};

/**
 * Replays your SIP and redemption cash flows into another fund: same dates and
 * amounts, bought at that fund's NAV. Cash dividends (from the dividends tab)
 * are paid on units held at book close and counted as money received.
 */
export function simulate(
  flowsIn: Pick<Transaction, "date" | "type" | "amount">[],
  navs: NavPoint[],
  dividends: Pick<Dividend, "date" | "cashPct">[],
): WhatIfResult {
  const trades = flowsIn
    .filter((t) => t.type === "SIP" || t.type === "REDEEM")
    .sort((a, b) => a.date.localeCompare(b.date));
  const latest = navs.length ? navs[navs.length - 1] : null;
  const events = [
    ...trades.map((t) => ({ kind: "trade" as const, date: t.date, t })),
    ...dividends.map((d) => ({ kind: "div" as const, date: d.date, d })),
  ].sort((a, b) => a.date.localeCompare(b.date) || (a.kind === "trade" ? -1 : 1));

  let units = 0;
  let invested = 0;
  let cashDividends = 0;
  const cash: CashFlow[] = [];
  const missingDates: string[] = [];

  for (const e of events) {
    if (e.kind === "trade") {
      const p = navOn(navs, e.date);
      if (!p) {
        missingDates.push(e.date);
        continue;
      }
      if (e.t.type === "SIP") {
        units += e.t.amount / p.nav;
        invested += e.t.amount;
        cash.push({ date: isoToUtcDate(e.date), amount: -e.t.amount });
      } else {
        const sell = Math.min(units, e.t.amount / p.nav);
        units -= sell;
        cash.push({ date: isoToUtcDate(e.date), amount: sell * p.nav });
      }
    } else if (units > 0 && (!latest || e.date <= latest.date)) {
      const amt = (e.d.cashPct / 100) * FACE_VALUE * units;
      cashDividends += amt;
      cash.push({ date: isoToUtcDate(e.date), amount: amt });
    }
  }

  const value = latest ? units * latest.nav : 0;
  if (latest && value > 0) cash.push({ date: isoToUtcDate(latest.date), amount: value });
  const redeemed = cash.filter((c) => c.amount > 0).reduce((s, c) => s + c.amount, 0) - cashDividends - value;
  return {
    invested,
    units,
    cashDividends,
    value,
    gain: value + cashDividends + redeemed - invested,
    xirr: xirr(cash),
    latest,
    missingDates,
  };
}
