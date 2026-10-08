import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { readWorkbook } from "./sheets";
import { assemble, type SheetData } from "./assemble";

export const SHEET_TAG = "sheet";
export type { SheetData };

export type SheetResult = { ok: true; data: SheetData } | { ok: false; error: string };

/**
 * The whole workbook, in two Sheets calls. Successful reads are cached for a
 * few minutes; `updateTag(SHEET_TAG)` (the Refresh button) makes the next read
 * fresh. Failures are returned, not thrown, and cached only for seconds.
 */
export async function getSheetData(): Promise<SheetResult> {
  "use cache";
  cacheTag(SHEET_TAG);
  try {
    const data = assemble(await readWorkbook());
    cacheLife("minutes");
    return { ok: true, data };
  } catch (e) {
    cacheLife("seconds");
    console.error("[sheets] read failed", e);
    const msg = e instanceof Error ? e.message : String(e);
    const tab = msg.match(/Unable to parse range: '?([^'\s]+)'?/)?.[1];
    return {
      ok: false,
      error: tab ? `The "${tab}" tab doesn't exist in the sheet yet. Run: pnpm sheet:init` : msg,
    };
  }
}
