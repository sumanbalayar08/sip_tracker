export type ProjectionInput = {
  startValue: number; // what the portfolio is worth today
  startInvested: number; // money already put in
  monthlySip: number; // total SIP per month today
  annualReturn: number; // e.g. 0.10
  years: number;
  stepUp?: number; // yearly SIP increase, e.g. 0.05
  inflation?: number; // for "today's money" figures
};

export type ProjectionPoint = {
  year: number;
  invested: number; // cumulative, including what's already invested
  value: number; // nominal
  realValue: number; // in today's money
};

/**
 * Month-by-month projection. Each SIP is added at the start of the month and
 * grows at the monthly equivalent of the annual return; the SIP rises by
 * `stepUp` once a year. Returns one point per year, starting at year 0.
 */
export function project(p: ProjectionInput): ProjectionPoint[] {
  const rm = Math.pow(1 + p.annualReturn, 1 / 12) - 1;
  const infl = p.inflation ?? 0;
  let value = p.startValue;
  let invested = p.startInvested;
  let sip = p.monthlySip;
  const out: ProjectionPoint[] = [{ year: 0, invested, value, realValue: value }];
  for (let y = 1; y <= p.years; y++) {
    for (let m = 0; m < 12; m++) {
      value = (value + sip) * (1 + rm);
      invested += sip;
    }
    out.push({ year: y, invested, value, realValue: value / Math.pow(1 + infl, y) });
    sip *= 1 + (p.stepUp ?? 0);
  }
  return out;
}
