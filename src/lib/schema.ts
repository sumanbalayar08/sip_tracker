/** Sheet tabs and their header rows. The bootstrap script creates these. */
export const TABS = {
  funds: ["code", "name", "manager", "type", "units_held", "current_nav", "nav_date", "active"],
  transactions: ["id", "fund_code", "date", "type", "amount", "nav", "units", "note"],
  nav_history: ["fund_code", "date", "nav"],
  snapshots: ["month", "fund_code", "invested", "value", "xirr"],
  settings: ["key", "value"],
} as const;

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
  active: boolean;
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

export type Settings = {
  fdRate: number; // e.g. 0.0414
};

export const DEFAULT_SETTINGS: Settings = { fdRate: 0.0414 };
