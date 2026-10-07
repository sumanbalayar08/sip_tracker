import type { Fund, Transaction } from "./schema";
import { isoToUtcDate } from "./parse";
import { xirr, type CashFlow } from "./xirr";

export type FundMetrics = {
  fund: Fund;
  invested: number; // SIP money in
  cashDividends: number;
  redeemed: number;
  units: number;
  unitsSource: "sheet" | "transactions";
  value: number; // units × current NAV
  gain: number; // value + cash out − money in
  absoluteReturn: number | null;
  xirr: number | null;
  beatsFd: boolean | null;
  txCount: number;
  firstDate: string | null;
};

export type PortfolioMetrics = {
  funds: FundMetrics[];
  invested: number;
  cashDividends: number;
  redeemed: number;
  value: number;
  gain: number;
  absoluteReturn: number | null;
  xirr: number | null;
  beatsFd: boolean | null;
  fdRate: number;
};

function flowsFor(fund: Fund, txs: Transaction[], value: number): CashFlow[] {
  const flows: CashFlow[] = [];
  for (const t of txs) {
    const date = isoToUtcDate(t.date);
    if (t.type === "SIP") flows.push({ date, amount: -t.amount });
    else if (t.type === "DIV_CASH" || t.type === "REDEEM") flows.push({ date, amount: t.amount });
    // DIV_REINVEST: no cash moves; the units show up in value.
  }
  if (value > 0 && fund.navDate) flows.push({ date: isoToUtcDate(fund.navDate), amount: value });
  return flows;
}

export function fundMetrics(fund: Fund, allTx: Transaction[], fdRate: number): FundMetrics {
  const txs = allTx.filter((t) => t.fundCode === fund.code);
  const sum = (type: Transaction["type"]) =>
    txs.filter((t) => t.type === type).reduce((s, t) => s + t.amount, 0);

  const invested = sum("SIP");
  const cashDividends = sum("DIV_CASH");
  const redeemed = sum("REDEEM");

  const txUnits = txs.reduce((s, t) => {
    if (t.units === null) return s;
    if (t.type === "SIP" || t.type === "DIV_REINVEST") return s + t.units;
    if (t.type === "REDEEM") return s - t.units;
    return s;
  }, 0);
  const useSheet = fund.unitsHeld !== null && fund.unitsHeld > 0;
  const units = useSheet ? (fund.unitsHeld as number) : txUnits;

  const value = units * fund.currentNav;
  const gain = value + cashDividends + redeemed - invested;
  const r = xirr(flowsFor(fund, txs, value));

  return {
    fund,
    invested,
    cashDividends,
    redeemed,
    units,
    unitsSource: useSheet ? "sheet" : "transactions",
    value,
    gain,
    absoluteReturn: invested > 0 ? gain / invested : null,
    xirr: r,
    beatsFd: r === null ? null : r > fdRate,
    txCount: txs.length,
    firstDate: txs[0]?.date ?? null,
  };
}

export function portfolioMetrics(funds: Fund[], txs: Transaction[], fdRate: number): PortfolioMetrics {
  const active = funds.filter((f) => f.active);
  const fm = active.map((f) => fundMetrics(f, txs, fdRate));
  const total = (k: "invested" | "cashDividends" | "redeemed" | "value") =>
    fm.reduce((s, m) => s + m[k], 0);
  const invested = total("invested");
  const value = total("value");
  const cashDividends = total("cashDividends");
  const redeemed = total("redeemed");
  const gain = value + cashDividends + redeemed - invested;
  const r = xirr(active.flatMap((f, i) => flowsFor(f, txs.filter((t) => t.fundCode === f.code), fm[i].value)));
  return {
    funds: fm,
    invested,
    cashDividends,
    redeemed,
    value,
    gain,
    absoluteReturn: invested > 0 ? gain / invested : null,
    xirr: r,
    beatsFd: r === null ? null : r > fdRate,
    fdRate,
  };
}
