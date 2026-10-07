/**
 * Creates the tabs + header rows the app expects, and seeds your two funds and
 * the FD benchmark. Safe to re-run: it never overwrites existing data.
 *
 *   pnpm sheet:init
 */
import { getSheets } from "../src/lib/sheets";
import { env } from "../src/lib/env";
import { TABS, type TabName } from "../src/lib/schema";

const SEED: Partial<Record<TabName, (string | number | boolean)[][]>> = {
  // NAVs: Bhadra 2083 (Sep 2026) monthly reports via ShareSansar. Update them.
  funds: [
    ["NIBLSF", "NIBL Sahabhagita Fund", "NIMB Ace Capital", "open", "", 10.11, "2026-09-16", true],
    ["NFCF", "Nabil Flexi Cap Fund", "Nabil Investment Banking", "open", "", 10.22, "2026-09-16", true],
  ],
  // Average max individual FD rate, Aug 2026 (ShareSansar).
  settings: [["fd_rate", 0.0414]],
};

async function main() {
  const sheets = getSheets();
  const spreadsheetId = env.sheetId;

  const meta = await sheets.spreadsheets.get({ spreadsheetId, fields: "properties.title,sheets.properties.title" });
  const existing = new Set(meta.data.sheets?.map((s) => s.properties?.title) ?? []);
  console.log(`Spreadsheet: ${meta.data.properties?.title}`);

  const missing = (Object.keys(TABS) as TabName[]).filter((t) => !existing.has(t));
  if (missing.length) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: missing.map((title) => ({ addSheet: { properties: { title } } })) },
    });
    console.log(`Created tabs: ${missing.join(", ")}`);
  }

  for (const tab of Object.keys(TABS) as TabName[]) {
    const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: `'${tab}'` });
    const rows = res.data.values ?? [];
    if (rows.length === 0) {
      const values = [[...TABS[tab]], ...(SEED[tab] ?? [])];
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `'${tab}'!A1`,
        valueInputOption: "RAW",
        requestBody: { values },
      });
      console.log(`${tab}: wrote headers${SEED[tab] ? ` + ${SEED[tab]!.length} seed row(s)` : ""}`);
    } else {
      const header = rows[0].map(String);
      const expected = [...TABS[tab]];
      const ok = expected.every((h, i) => header[i] === h);
      console.log(`${tab}: has data${ok ? "" : ` — WARNING header differs, expected: ${expected.join(", ")}`}`);
    }
  }
  console.log("Done.");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
