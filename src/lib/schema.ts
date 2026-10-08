/** Sheet tabs and their header rows. The bootstrap script creates these. */
export const TABS = {
  funds: ["code", "name", "manager", "type", "units_held", "current_nav", "nav_date", "active"],
  nav_history: ["fund_code", "date", "nav"],
  dividends: ["fund_code", "book_close_date", "cash_pct", "note"],
  snapshots: ["month", "fund_code", "invested", "value", "xirr"],
  settings: ["key", "value"],
} as const;

/** Each fund you hold gets its own transactions tab, named by its code (e.g. "NIBLSF"). */
export const FUND_TAB_HEADERS = ["id", "date", "type", "amount", "nav", "units", "note"] as const;

/** Old single-tab layout, read only so `pnpm sheet:split` can migrate it. */
export const LEGACY_TX_TAB = "transactions";

export type TabName = keyof typeof TABS;

export const TX_TYPES = ["SIP", "DIV_CASH", "DIV_REINVEST", "REDEEM"] as const;
export type TxType = (typeof TX_TYPES)[number];

export type Fund = {
  code: string;
  name: string;
  manager: string;
  type: "open" | "closed";
  unitsHeld: number | null; // from MeroShare / SIP statement; null = derive from transactions
  currentNav: number;
  navDate: string; // YYYY-MM-DD
  active: boolean; // true = you hold it; false = tracked for comparison only
};

export type Transaction = {
  id: string;
  fundCode: string;
  date: string; // YYYY-MM-DD
  type: TxType;
  amount: number; // Rs, always positive
  nav: number | null;
  units: number | null; // units bought (SIP / DIV_REINVEST) or sold (REDEEM)
  note: string;
};

export type NavPoint = { date: string; nav: number };

export type Dividend = { fundCode: string; date: string; cashPct: number };

export type Settings = {
  fdRate: number; // e.g. 0.0414
  inflation: number; // e.g. 0.05
  stepUp: number; // yearly SIP increase, e.g. 0.05
  scenarios: [number, number, number]; // conservative / expected / optimistic annual returns
  horizonYears: number;
  monthlySip: Record<string, number>; // per fund code, from monthly_sip_<CODE>
};

export const DEFAULT_SETTINGS: Settings = {
  fdRate: 0.0414,
  inflation: 0.05,
  stepUp: 0,
  scenarios: [0.08, 0.1, 0.12],
  horizonYears: 30,
  monthlySip: {},
};
