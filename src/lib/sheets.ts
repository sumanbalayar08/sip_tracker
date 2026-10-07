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

/** Read several whole tabs in one API call. */
export async function readTabs<T extends TabName>(tabs: T[]): Promise<Record<T, Cell[][]>> {
  const res = await getSheets().spreadsheets.values.batchGet({
    spreadsheetId: env.sheetId,
    ranges: tabs.map((t) => `'${t}'`),
    valueRenderOption: "UNFORMATTED_VALUE",
    dateTimeRenderOption: "SERIAL_NUMBER",
  });
  const out = {} as Record<T, Cell[][]>;
  tabs.forEach((t, i) => {
    out[t] = (res.data.valueRanges?.[i]?.values ?? []) as Cell[][];
  });
  return out;
}

/** Append rows to a tab. Values are written as-is (no locale parsing). */
export async function appendRows(tab: TabName, rows: Cell[][]): Promise<void> {
  if (rows.length === 0) return;
  await getSheets().spreadsheets.values.append({
    spreadsheetId: env.sheetId,
    range: `'${tab}'!A1`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: rows },
  });
}

export const headersFor = (tab: TabName): readonly string[] => TABS[tab];
