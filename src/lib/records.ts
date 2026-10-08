import {
  DEFAULT_SETTINGS,
  TX_TYPES,
  type Dividend,
  type Fund,
  type NavPoint,
  type Settings,
  type Transaction,
  type TxType,
} from "./schema";
import { rowsToRecords, toBool, toIsoDate, toNumber, type Cell } from "./parse";

export function parseFunds(rows: Cell[][]): Fund[] {
  return rowsToRecords(rows)
    .map((r) => ({
      code: String(r.code ?? "").trim().toUpperCase(),
      name: String(r.name ?? "").trim(),
      manager: String(r.manager ?? "").trim(),
      type: String(r.type ?? "open").trim().toLowerCase() === "closed" ? ("closed" as const) : ("open" as const),
      unitsHeld: toNumber(r.units_held),
      currentNav: toNumber(r.current_nav) ?? 0,
      navDate: toIsoDate(r.nav_date) ?? "",
      active: toBool(r.active),
    }))
    .filter((f) => f.code);
}

/** Parse a transactions tab. Per-fund tabs have no fund_code column, so pass `fundCode`. */
export function parseTransactions(
  rows: Cell[][],
  fundCode?: string,
): { transactions: Transaction[]; skipped: number } {
  let skipped = 0;
  const transactions: Transaction[] = [];
  for (const r of rowsToRecords(rows)) {
    const type = String(r.type ?? "").trim().toUpperCase() as TxType;
    const date = toIsoDate(r.date);
    const amount = toNumber(r.amount);
    const code = String(r.fund_code || fundCode || "").trim().toUpperCase();
    if (!TX_TYPES.includes(type) || !date || amount === null || !code) {
      skipped++;
      continue;
    }
    const nav = toNumber(r.nav);
    let units = toNumber(r.units);
    if (units === null && nav && type !== "DIV_CASH") units = amount / nav;
    transactions.push({
      id: String(r.id ?? ""),
      fundCode: code,
      date,
      type,
      amount: Math.abs(amount),
      nav,
      units: units === null ? null : Math.abs(units),
      note: String(r.note ?? ""),
    });
  }
  transactions.sort((a, b) => a.date.localeCompare(b.date));
  return { transactions, skipped };
}

export function parseNavHistory(rows: Cell[][]): Record<string, NavPoint[]> {
  const out: Record<string, NavPoint[]> = {};
  for (const r of rowsToRecords(rows)) {
    const code = String(r.fund_code ?? "").trim().toUpperCase();
    const date = toIsoDate(r.date);
    const nav = toNumber(r.nav);
    if (!code || !date || !nav) continue;
    (out[code] ??= []).push({ date, nav });
  }
  return out;
}

export function parseDividends(rows: Cell[][]): Dividend[] {
  return rowsToRecords(rows)
    .map((r) => ({
      fundCode: String(r.fund_code ?? "").trim().toUpperCase(),
      date: toIsoDate(r.book_close_date) ?? "",
      cashPct: toNumber(r.cash_pct) ?? 0,
    }))
    .filter((d) => d.fundCode && d.date && d.cashPct > 0);
}

/** Rates may be written as 0.08 or 8. */
const rate = (v: Cell, fallback: number) => {
  const n = toNumber(v);
  return n === null ? fallback : n > 1 ? n / 100 : n;
};

export function parseSettings(rows: Cell[][]): Settings {
  const map = new Map(rowsToRecords(rows).map((r) => [String(r.key ?? "").trim().toLowerCase(), r.value]));
  const d = DEFAULT_SETTINGS;
  const sc = String(map.get("scenarios") ?? "")
    .split(/[,;/ ]+/)
    .map((x) => rate(x, NaN))
    .filter((x) => Number.isFinite(x));
  const monthlySip: Record<string, number> = {};
  for (const [k, v] of map) {
    const m = k.match(/^monthly_sip_(.+)$/);
    const n = toNumber(v);
    if (m && n !== null) monthlySip[m[1].toUpperCase()] = n;
  }
  return {
    fdRate: rate(map.get("fd_rate"), d.fdRate),
    inflation: rate(map.get("inflation"), d.inflation),
    stepUp: rate(map.get("step_up"), d.stepUp),
    scenarios: sc.length === 3 ? [sc[0], sc[1], sc[2]] : d.scenarios,
    horizonYears: toNumber(map.get("horizon_years")) ?? d.horizonYears,
    monthlySip,
  };
}
