/**
 * Nepali fiscal year (Shrawan 1 – Ashadh end). Shrawan 1 falls on 16 or 17
 * July; we use 16 July as the boundary, which can misplace a transaction made
 * on 16 July itself in some years.
 */
export function nepaliFiscalYear(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const startYear = m > 7 || (m === 7 && d >= 16) ? y + 57 : y + 56;
  return `${startYear}/${String((startYear + 1) % 100).padStart(2, "0")}`;
}
