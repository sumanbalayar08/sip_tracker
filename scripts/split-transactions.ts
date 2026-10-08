/**
 * Moves rows from the old single "transactions" tab into one tab per fund
 * (NIBLSF, NFCF, ...), then renames the old tab to "transactions_archive".
 * Safe to re-run: rows whose id already exists in the fund tab are skipped.
 *
 *   pnpm sheet:split
 */
import { FUND_TAB_HEADERS, LEGACY_TX_TAB } from "../src/lib/schema";
import { addTabs, append, readValues, run, sheets, spreadsheetId, tabTitles, writeFrom } from "./sheet-utils";

run(async () => {
  const tabs = await tabTitles();
  if (!tabs.has(LEGACY_TX_TAB)) {
    console.log(`No "${LEGACY_TX_TAB}" tab — nothing to split.`);
    return;
  }
  const rows = await readValues(LEGACY_TX_TAB);
  const header = (rows[0] ?? []).map((h) => String(h).trim());
  const col = (name: string) => header.indexOf(name);
  if (col("fund_code") < 0) throw new Error(`"${LEGACY_TX_TAB}" has no fund_code column.`);

  const byFund = new Map<string, unknown[][]>();
  for (const r of rows.slice(1)) {
    const code = String(r[col("fund_code")] ?? "").trim().toUpperCase();
    if (!code) continue;
    const out = FUND_TAB_HEADERS.map((h) => (col(h) >= 0 ? (r[col(h)] ?? "") : ""));
    if (!byFund.has(code)) byFund.set(code, []);
    byFund.get(code)!.push(out);
  }

  await addTabs([...byFund.keys()].filter((c) => !tabs.has(c)));
  for (const [code, newRows] of byFund) {
    const existing = await readValues(code);
    if (existing.length === 0) await writeFrom(code, [[...FUND_TAB_HEADERS]]);
    const ids = new Set(existing.slice(1).map((r) => String(r[0])));
    const toAdd = newRows.filter((r) => !r[0] || !ids.has(String(r[0])));
    await append(code, toAdd);
    console.log(`${code}: moved ${toAdd.length} row(s)${newRows.length - toAdd.length ? `, skipped ${newRows.length - toAdd.length} already there` : ""}`);
  }

  const archive = tabs.has("transactions_archive") ? `transactions_archive_${Date.now()}` : "transactions_archive";
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{ updateSheetProperties: { properties: { sheetId: tabs.get(LEGACY_TX_TAB), title: archive }, fields: "title" } }],
    },
  });
  console.log(`Renamed "${LEGACY_TX_TAB}" to "${archive}". Delete it once you've checked the fund tabs.`);
});
