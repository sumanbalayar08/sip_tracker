import { DEFAULT_SETTINGS, TX_TYPES, type Fund, type Settings, type Transaction, type TxType } from "./schema";
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

export function parseTransactions(rows: Cell[][]): { transactions: Transaction[]; skipped: number } {
  let skipped = 0;
  const transactions: Transaction[] = [];
  for (const r of rowsToRecords(rows)) {
    const type = String(r.type ?? "").trim().toUpperCase() as TxType;
    const date = toIsoDate(r.date);
    const amount = toNumber(r.amount);
    const fundCode = String(r.fund_code ?? "").trim().toUpperCase();
    if (!TX_TYPES.includes(type) || !date || amount === null || !fundCode) {
      skipped++;
      continue;
    }
    const nav = toNumber(r.nav);
    let units = toNumber(r.units);
    if (units === null && nav && type !== "DIV_CASH") units = amount / nav;
    transactions.push({
      id: String(r.id ?? ""),
      fundCode,
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

export function parseSettings(rows: Cell[][]): Settings {
  const map = new Map(rowsToRecords(rows).map((r) => [String(r.key ?? "").trim(), r.value]));
  const fd = toNumber(map.get("fd_rate"));
  return {
    // Accept 0.0414 or 4.14
    fdRate: fd === null ? DEFAULT_SETTINGS.fdRate : fd > 1 ? fd / 100 : fd,
  };
}
