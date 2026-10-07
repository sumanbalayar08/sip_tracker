/** Helpers to turn raw sheet cells into typed values. */

export type Cell = string | number | boolean | null | undefined;

export function toNumber(v: Cell): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "boolean") return null;
  const n = Number(String(v).replace(/[,\s]/g, "").replace(/^Rs\.?/i, ""));
  return Number.isFinite(n) ? n : null;
}

export function toBool(v: Cell, fallback = true): boolean {
  if (v === null || v === undefined || v === "") return fallback;
  if (typeof v === "boolean") return v;
  return !/^(false|no|0|n)$/i.test(String(v).trim());
}

const SHEETS_EPOCH_UTC = Date.UTC(1899, 11, 30);

/**
 * Normalise a date cell to YYYY-MM-DD. Handles ISO strings and the serial
 * numbers Google Sheets uses when a cell is formatted as a date.
 */
export function toIsoDate(v: Cell): string | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") {
    const d = new Date(SHEETS_EPOCH_UTC + Math.round(v) * 86_400_000);
    return d.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

export function isoToUtcDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Map rows (first row = headers) to objects keyed by header. */
export function rowsToRecords(rows: Cell[][] | null | undefined): Record<string, Cell>[] {
  if (!rows || rows.length < 2) return [];
  const headers = rows[0].map((h) => String(h ?? "").trim());
  return rows
    .slice(1)
    .filter((r) => r.some((c) => c !== "" && c !== null && c !== undefined))
    .map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i]])));
}
