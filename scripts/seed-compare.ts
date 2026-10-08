/**
 * Loads comparison funds, monthly NAV history and dividends from
 * data/compare-seed.json into the sheet. Comparison funds are added to the
 * funds tab with active = FALSE. Safe to re-run: existing rows are skipped.
 *
 *   pnpm sheet:seed-compare
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { toIsoDate } from "../src/lib/parse";
import { append, readValues, run } from "./sheet-utils";

type Seed = {
  funds: { code: string; name: string; manager: string; type: string }[];
  nav_history: { fund_code: string; date: string; nav: number }[];
  dividends: { fund_code: string; book_close_date: string; cash_pct: number; fiscal_year?: string }[];
};

run(async () => {
  const seed: Seed = JSON.parse(readFileSync(resolve(process.cwd(), "data/compare-seed.json"), "utf8"));

  // funds: add missing codes as comparison-only, with their latest NAV
  const funds = await readValues("funds");
  const haveFund = new Set(funds.slice(1).map((r) => String(r[0]).toUpperCase()));
  const latest = new Map<string, { date: string; nav: number }>();
  for (const n of seed.nav_history) {
    const l = latest.get(n.fund_code);
    if (!l || n.date > l.date) latest.set(n.fund_code, { date: n.date, nav: n.nav });
  }
  const newFunds = seed.funds
    .filter((f) => !haveFund.has(f.code))
    .map((f) => [f.code, f.name, f.manager, f.type, "", latest.get(f.code)?.nav ?? "", latest.get(f.code)?.date ?? "", false]);
  await append("funds", newFunds);
  console.log(`funds: added ${newFunds.length} comparison fund(s)`);

  const key = (code: unknown, date: unknown) => `${String(code).toUpperCase()}|${toIsoDate(date as string)}`;

  const nav = await readValues("nav_history");
  const haveNav = new Set(nav.slice(1).map((r) => key(r[0], r[1])));
  const newNav = seed.nav_history.filter((n) => !haveNav.has(key(n.fund_code, n.date))).map((n) => [n.fund_code, n.date, n.nav]);
  await append("nav_history", newNav);
  console.log(`nav_history: added ${newNav.length} row(s)`);

  const div = await readValues("dividends");
  const haveDiv = new Set(div.slice(1).map((r) => key(r[0], r[1])));
  const newDiv = seed.dividends
    .filter((d) => !haveDiv.has(key(d.fund_code, d.book_close_date)))
    .map((d) => [d.fund_code, d.book_close_date, d.cash_pct, d.fiscal_year ? `FY ${d.fiscal_year}` : ""]);
  await append("dividends", newDiv);
  console.log(`dividends: added ${newDiv.length} row(s)`);
});
