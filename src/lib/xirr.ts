export type CashFlow = { date: Date; amount: number };

const DAY_MS = 86_400_000;

/**
 * Annualised internal rate of return for irregular cash flows (Excel XIRR,
 * 365-day year). Money in is negative, money out (and current value) positive.
 * Returns null when there is no solution (e.g. all flows have one sign).
 */
export function xirr(flows: CashFlow[], guess = 0.1): number | null {
  const fs = flows.filter((f) => f.amount !== 0 && Number.isFinite(f.amount));
  if (fs.length < 2) return null;
  if (!fs.some((f) => f.amount > 0) || !fs.some((f) => f.amount < 0)) return null;

  const t0 = Math.min(...fs.map((f) => f.date.getTime()));
  const ts = fs.map((f) => (f.date.getTime() - t0) / DAY_MS / 365);

  const npv = (r: number) => fs.reduce((s, f, i) => s + f.amount / Math.pow(1 + r, ts[i]), 0);
  const dnpv = (r: number) =>
    fs.reduce((s, f, i) => s - (ts[i] * f.amount) / Math.pow(1 + r, ts[i] + 1), 0);

  // Newton-Raphson
  let r = guess;
  for (let i = 0; i < 100; i++) {
    const v = npv(r);
    const d = dnpv(r);
    if (!Number.isFinite(v) || !Number.isFinite(d) || d === 0) break;
    let next = r - v / d;
    if (next <= -1) next = (r - 1) / 2; // stay inside the domain
    if (Math.abs(next - r) < 1e-10) return next;
    r = next;
  }

  // Bisection fallback
  let lo = -0.9999;
  let hi = 1;
  while (npv(lo) * npv(hi) > 0 && hi < 1e6) hi *= 2;
  if (npv(lo) * npv(hi) > 0) return null;
  for (let i = 0; i < 300; i++) {
    const mid = (lo + hi) / 2;
    const v = npv(mid);
    if (Math.abs(v) < 1e-9 || hi - lo < 1e-12) return mid;
    if (npv(lo) * v < 0) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}
