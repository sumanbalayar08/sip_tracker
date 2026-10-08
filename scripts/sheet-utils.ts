import { getSheets } from "../src/lib/sheets";
import { env } from "../src/lib/env";

export const sheets = getSheets();
export const spreadsheetId = env.sheetId;

export async function tabTitles(): Promise<Map<string, number>> {
  const meta = await sheets.spreadsheets.get({ spreadsheetId, fields: "sheets.properties(title,sheetId)" });
  return new Map((meta.data.sheets ?? []).map((s) => [s.properties!.title!, s.properties!.sheetId!]));
}

export async function addTabs(titles: string[]) {
  if (!titles.length) return;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests: titles.map((title) => ({ addSheet: { properties: { title } } })) },
  });
}

export async function readValues(tab: string): Promise<(string | number | boolean)[][]> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${tab}'`,
    valueRenderOption: "UNFORMATTED_VALUE",
    dateTimeRenderOption: "FORMATTED_STRING",
  });
  return (res.data.values ?? []) as (string | number | boolean)[][];
}

export async function writeFrom(tab: string, values: unknown[][], startRow = 1) {
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${tab}'!A${startRow}`,
    valueInputOption: "RAW",
    requestBody: { values },
  });
}

export async function append(tab: string, values: unknown[][]) {
  if (!values.length) return;
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `'${tab}'!A1`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values },
  });
}

export function run(main: () => Promise<void>) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
