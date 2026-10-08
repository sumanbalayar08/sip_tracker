import type { Fund, Settings, Transaction } from "./schema";
import { isoToUtcDate } from "./parse";

/**
 * Current monthly SIP for a fund: `monthly_sip_<CODE>` from settings if set,
 * otherwise the last SIP amount (rounded to Rs 100) when it was within ~2.5
 * months of the fund's NAV date, i.e. the SIP still looks active.
 */
export function currentMonthlySip(fund: Fund, txs: Transaction[], settings: Settings): number {
  const override = settings.monthlySip[fund.code];
  if (override !== undefined) return override;
  const sips = txs.filter((t) => t.fundCode === fund.code && t.type === "SIP");
  const last = sips[sips.length - 1];
  if (!last) return 0;
  const ref = fund.navDate || last.date;
  const days = (isoToUtcDate(ref).getTime() - isoToUtcDate(last.date).getTime()) / 86_400_000;
  return days <= 75 ? Math.round(last.amount / 100) * 100 : 0;
}
