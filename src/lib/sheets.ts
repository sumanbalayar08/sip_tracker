import { auth, sheets as sheetsApi, type sheets_v4 } from "@googleapis/sheets";
import { env } from "./env";
import { TABS, type TabName } from "./schema";
import type { Cell } from "./parse";

let client: sheets_v4.Sheets | null = null;

export function getSheets(): sheets_v4.Sheets {
  if (client) return client;
  const jwt = new auth.JWT({
    email: env.serviceAccountEmail,
    key: env.serviceAccountKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  client = sheetsApi({ version: "v4", auth: jwt });
  return client;
}

export async function listTabs(): Promise<string[]> {
  const meta = await getSheets().spreadsheets.get({
    spreadsheetId: env.sheetId,
    fields: "sheets.properties.title",
  });
  return (meta.data.sheets ?? []).map((s) => s.properties?.title ?? "").filter(Boolean);
}

/** Read several whole tabs in one API call. Missing tabs are skipped. */
export async function readTabs(tabs: string[]): Promise<Record<string, Cell[][]>> {
  if (tabs.length === 0) return {};
  const res = await getSheets().spreadsheets.values.batchGet({
    spreadsheetId: env.sheetId,
    ranges: tabs.map((t) => `'${t.replace(/'/g, "''")}'`),
    valueRenderOption: "UNFORMATTED_VALUE",
    dateTimeRenderOption: "SERIAL_NUMBER",
  });
  const out: Record<string, Cell[][]> = {};
  tabs.forEach((t, i) => {
    out[t] = (res.data.valueRanges?.[i]?.values ?? []) as Cell[][];
  });
  return out;
}

/** Every tab in the spreadsheet, keyed by title. Two API calls. */
export async function readWorkbook(): Promise<Record<string, Cell[][]>> {
  // Local development without Google access: SHEETS_FIXTURE=path/to/workbook.json
  const fixture = process.env.SHEETS_FIXTURE;
  if (fixture && process.env.NODE_ENV !== "production") {
    const { readFile } = await import("node:fs/promises");
    return JSON.parse(await readFile(fixture, "utf8"));
  }
  return readTabs(await listTabs());
}

/** Append rows to a tab. Values are written as-is (no locale parsing). */
export async function appendRows(tab: string, rows: Cell[][]): Promise<void> {
  if (rows.length === 0) return;
  await getSheets().spreadsheets.values.append({
    spreadsheetId: env.sheetId,
    range: `'${tab.replace(/'/g, "''")}'!A1`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: rows },
  });
}

export const headersFor = (tab: TabName): readonly string[] => TABS[tab];
