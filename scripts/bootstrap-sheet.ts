/**
 * Creates the tabs + header rows the app expects (including one transactions
 * tab per fund you hold), and seeds your two funds and default settings.
 * Safe to re-run: it never overwrites existing data.
 *
 *   pnpm sheet:init
 */
import { FUND_TAB_HEADERS, TABS, type TabName } from "../src/lib/schema";
import { addTabs, readValues, run, tabTitles, writeFrom } from "./sheet-utils";

const SEED: Partial<Record<TabName, (string | number | boolean)[][]>> = {
  // NAVs: Bhadra 2083 (Sep 2026) monthly reports via ShareSansar. Update them.
  funds: [
    ["NIBLSF", "NIBL Sahabhagita Fund", "NIMB Ace Capital", "open", "", 10.11, "2026-09-16", true],
    ["NFCF", "Nabil Flexi Cap Fund", "Nabil Investment Banking", "open", "", 10.22, "2026-09-16", true],
  ],
  settings: [
    ["fd_rate", 0.0414], // average max individual FD rate, Aug 2026 (ShareSansar)
    ["inflation", 0.05],
    ["step_up", 0],
    ["scenarios", "0.08,0.10,0.12"],
    ["horizon_years", 30],
  ],
};

run(async () => {
  const existing = await tabTitles();
  const missing = (Object.keys(TABS) as TabName[]).filter((t) => !existing.has(t));
  await addTabs(missing);
  if (missing.length) console.log(`Created tabs: ${missing.join(", ")}`);

  for (const tab of Object.keys(TABS) as TabName[]) {
    const rows = await readValues(tab);
    if (rows.length === 0) {
      await writeFrom(tab, [[...TABS[tab]], ...(SEED[tab] ?? [])]);
      console.log(`${tab}: wrote headers${SEED[tab] ? ` + ${SEED[tab]!.length} seed row(s)` : ""}`);
      continue;
    }
    const header = rows[0].map(String);
    const expected = [...TABS[tab]];
    if (!expected.every((h, i) => header[i] === h)) {
      console.log(`${tab}: WARNING header differs, expected: ${expected.join(", ")}`);
    } else if (tab === "settings") {
      // Add any settings keys introduced since the sheet was created.
      const have = new Set(rows.slice(1).map((r) => String(r[0])));
      const add = (SEED.settings ?? []).filter((r) => !have.has(String(r[0])));
      if (add.length) {
        await writeFrom(tab, add, rows.length + 1);
        console.log(`settings: added ${add.map((r) => r[0]).join(", ")}`);
      } else console.log("settings: ok");
    } else console.log(`${tab}: ok`);
  }

  // One transactions tab per fund you hold.
  const funds = (await readValues("funds")).slice(1);
  const active = funds
    .filter((r) => r[0] && !/^(false|no|0)$/i.test(String(r[7] ?? "true")))
    .map((r) => String(r[0]).trim().toUpperCase());
  const now = await tabTitles();
  const newFundTabs = active.filter((c) => !now.has(c));
  await addTabs(newFundTabs);
  for (const code of active) {
    const rows = await readValues(code);
    if (rows.length === 0) {
      await writeFrom(code, [[...FUND_TAB_HEADERS]]);
      console.log(`${code}: created transactions tab`);
    } else console.log(`${code}: ok`);
  }
  console.log("Done. If you still have a 'transactions' tab, run: pnpm sheet:split");
});
