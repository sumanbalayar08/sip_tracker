const rs = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const units = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 3 });

export const formatRs = (n: number) => `Rs ${rs.format(Math.round(n))}`;
export const formatUnits = (n: number) => units.format(n);
export const formatNav = (n: number) => n.toFixed(2);
export const formatPct = (n: number | null) =>
  n === null || !Number.isFinite(n) ? "–" : `${(n * 100).toFixed(1)}%`;
export const signed = (s: string, n: number) => (n > 0 ? `+${s}` : s);
