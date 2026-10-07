import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { readTabs } from "./sheets";
import { parseFunds, parseSettings, parseTransactions } from "./records";

export const SHEET_TAG = "sheet";

export type SheetData = {
  funds: ReturnType<typeof parseFunds>;
  transactions: ReturnType<typeof parseTransactions>["transactions"];
  skippedRows: number;
  settings: ReturnType<typeof parseSettings>;
};

export type SheetResult = { ok: true; data: SheetData } | { ok: false; error: string };

/**
 * Everything the dashboard needs, in one Sheets call. Successful reads are
 * cached for a few minutes to stay well under the Sheets read quota;
 * `updateTag(SHEET_TAG)` (the Refresh button, or any write) makes the next
 * read fresh. Failures are returned (not thrown) so the page can show the
 * real reason, and are only cached for seconds.
 */
export async function getSheetData(): Promise<SheetResult> {
  "use cache";
  cacheTag(SHEET_TAG);
  try {
    const raw = await readTabs(["funds", "transactions", "settings"]);
    const { transactions, skipped } = parseTransactions(raw.transactions);
    cacheLife("minutes");
    return {
      ok: true,
      data: {
        funds: parseFunds(raw.funds),
        transactions,
        skippedRows: skipped,
        settings: parseSettings(raw.settings),
      },
    };
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
