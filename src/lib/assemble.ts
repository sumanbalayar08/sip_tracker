import { parseDividends, parseFunds, parseNavHistory, parseSettings, parseTransactions } from "./records";
import { LEGACY_TX_TAB, type Dividend, type Fund, type NavPoint, type Settings, type Transaction } from "./schema";
import type { Cell } from "./parse";

export type SheetData = {
  funds: Fund[]; // active and comparison-only
  transactions: Transaction[]; // from the per-fund tabs (and legacy tab for funds without one)
  skippedRows: number;
  missingFundTabs: string[]; // active funds with no tab of their own yet
  legacyRows: number; // rows still read from the old "transactions" tab
  navHistory: Record<string, NavPoint[]>; // nav_history + purchase NAVs + current NAV, sorted
  dividends: Dividend[];
  settings: Settings;
};

function buildNavHistory(funds: Fund[], fromTab: Record<string, NavPoint[]>, txs: Transaction[]) {
  const map = new Map<string, Map<string, number>>();
  const put = (code: string, date: string, nav: number) => {
    if (!map.has(code)) map.set(code, new Map());
    map.get(code)!.set(date, nav); // later sources win for the same date
  };
  for (const [code, pts] of Object.entries(fromTab)) pts.forEach((p) => put(code, p.date, p.nav));
  for (const t of txs) if (t.nav && (t.type === "SIP" || t.type === "REDEEM")) put(t.fundCode, t.date, t.nav);
  for (const f of funds) if (f.currentNav > 0 && f.navDate) put(f.code, f.navDate, f.currentNav);
  const out: Record<string, NavPoint[]> = {};
  for (const [code, m] of map) {
    out[code] = [...m].map(([date, nav]) => ({ date, nav })).sort((a, b) => a.date.localeCompare(b.date));
  }
  return out;
}

export function assemble(book: Record<string, Cell[][]>): SheetData {
  const funds = parseFunds(book.funds ?? []);
  const transactions: Transaction[] = [];
  let skipped = 0;
  const missingFundTabs: string[] = [];
  const withOwnTab = new Set<string>();

  for (const f of funds) {
    const rows = book[f.code];
    if (!rows) {
      if (f.active) missingFundTabs.push(f.code);
      continue;
    }
    withOwnTab.add(f.code);
    const r = parseTransactions(rows, f.code);
    transactions.push(...r.transactions);
    skipped += r.skipped;
  }

  // Old layout: only use rows for funds that don't have their own tab yet, so nothing is counted twice.
  const legacy = parseTransactions(book[LEGACY_TX_TAB] ?? []);
  const legacyUsed = legacy.transactions.filter((t) => !withOwnTab.has(t.fundCode));
  transactions.push(...legacyUsed);
  transactions.sort((a, b) => a.date.localeCompare(b.date));

  return {
    funds,
    transactions,
    skippedRows: skipped + legacy.skipped,
    missingFundTabs: missingFundTabs.filter((c) => !legacyUsed.some((t) => t.fundCode === c)),
    legacyRows: legacyUsed.length,
    navHistory: buildNavHistory(funds, parseNavHistory(book.nav_history ?? []), transactions),
    dividends: parseDividends(book.dividends ?? []),
    settings: parseSettings(book.settings ?? []),
  };
}

