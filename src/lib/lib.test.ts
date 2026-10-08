import { describe, expect, it } from "vitest";
import { xirr } from "./xirr";
import { nepaliFiscalYear } from "./fy";
import { toIsoDate, isoToUtcDate } from "./parse";
import { parseTransactions } from "./records";
import { fundMetrics } from "./metrics";
import type { Fund } from "./schema";

const d = (s: string) => isoToUtcDate(s);

describe("xirr", () => {
  it("matches Excel's documented example (37.34%)", () => {
    const r = xirr([
      { date: d("2008-01-01"), amount: -10000 },
      { date: d("2008-03-01"), amount: 2750 },
      { date: d("2008-10-30"), amount: 4250 },
      { date: d("2009-02-15"), amount: 3250 },
      { date: d("2009-04-01"), amount: 2750 },
    ]);
    expect(r).toBeCloseTo(0.373362535, 6);
  });

  it("handles a loss", () => {
    const r = xirr([
      { date: d("2024-01-01"), amount: -1000 },
      { date: d("2025-01-01"), amount: 900 },
    ]);
    expect(r).toBeCloseTo(-0.1, 2);
  });

  it("returns null without a sign change", () => {
    expect(xirr([{ date: d("2024-01-01"), amount: -1000 }])).toBeNull();
    expect(
      xirr([
        { date: d("2024-01-01"), amount: -1000 },
        { date: d("2024-02-01"), amount: -1000 },
      ]),
    ).toBeNull();
  });
});

describe("nepaliFiscalYear", () => {
  it("maps AD dates around the Shrawan boundary", () => {
    expect(nepaliFiscalYear("2026-09-16")).toBe("2083/84");
    expect(nepaliFiscalYear("2026-07-10")).toBe("2082/83");
    expect(nepaliFiscalYear("2026-07-16")).toBe("2083/84");
    expect(nepaliFiscalYear("2027-01-05")).toBe("2083/84");
  });
});

describe("toIsoDate", () => {
  it("reads Sheets serial numbers and strings", () => {
    expect(toIsoDate(46281)).toBe("2026-09-16");
    expect(toIsoDate("2026-9-1")).toBe("2026-09-01");
    expect(toIsoDate("")).toBeNull();
  });
});

describe("fundMetrics", () => {
  const fund: Fund = {
    code: "TEST",
    name: "Test Fund",
    manager: "",
    type: "open",
    unitsHeld: null,
    currentNav: 11,
    navDate: "2026-01-01",
    active: true,
  };

  it("derives units from SIPs and computes gain", () => {
    const { transactions } = parseTransactions([
      ["id", "fund_code", "date", "type", "amount", "nav", "units", "note"],
      ["1", "TEST", "2025-01-01", "SIP", 5000, 10, "", ""],
      ["2", "TEST", "2025-07-01", "SIP", 5000, 10, "", ""],
      ["3", "TEST", "2025-12-01", "DIV_CASH", 500, "", "", ""],
    ]);
    const m = fundMetrics(fund, transactions, 0.04);
    expect(m.units).toBeCloseTo(1000);
    expect(m.value).toBeCloseTo(11000);
    expect(m.invested).toBe(10000);
    expect(m.gain).toBeCloseTo(1500);
    expect(m.xirr).toBeGreaterThan(0.1);
    expect(m.beatsFd).toBe(true);
  });

  it("prefers units_held from the sheet when set", () => {
    const m = fundMetrics({ ...fund, unitsHeld: 500 }, [], 0.04);
    expect(m.units).toBe(500);
    expect(m.unitsSource).toBe("sheet");
  });
});

import { project } from "./projection";
import { navOn, simulate } from "./whatif";
import { assemble } from "./assemble";

describe("project", () => {
  it("matches the annuity-due formula for a level SIP", () => {
    const pts = project({ startValue: 0, startInvested: 0, monthlySip: 20000, annualReturn: 0.12, years: 30 });
    const rm = Math.pow(1.12, 1 / 12) - 1;
    const fv = (20000 * (Math.pow(1 + rm, 360) - 1)) / rm * (1 + rm);
    expect(pts).toHaveLength(31);
    expect(pts[30].invested).toBe(7_200_000);
    expect(pts[30].value).toBeCloseTo(fv, 0); // ≈ Rs 6.16 crore
  });

  it("compounds an existing balance with no SIP", () => {
    const pts = project({ startValue: 100000, startInvested: 100000, monthlySip: 0, annualReturn: 0.1, years: 2 });
    expect(pts[2].value).toBeCloseTo(121000, 0);
  });

  it("applies step-up and inflation", () => {
    const pts = project({ startValue: 0, startInvested: 0, monthlySip: 1000, annualReturn: 0, years: 2, stepUp: 0.1, inflation: 0.1 });
    expect(pts[2].invested).toBeCloseTo(12000 + 13200);
    expect(pts[2].realValue).toBeCloseTo(25200 / 1.21);
  });
});

describe("navOn", () => {
  const navs = [
    { date: "2025-05-14", nav: 10 },
    { date: "2025-06-14", nav: 11 },
  ];
  it("uses the latest NAV on or before the date", () => {
    expect(navOn(navs, "2025-06-01")?.nav).toBe(10);
    expect(navOn(navs, "2025-06-14")?.nav).toBe(11);
  });
  it("falls forward a few days when history starts later", () => {
    expect(navOn(navs, "2025-05-11")?.nav).toBe(10);
    expect(navOn(navs, "2025-01-01")).toBeNull();
  });
  it("refuses stale NAVs", () => {
    expect(navOn(navs, "2025-12-01")).toBeNull();
  });
});

describe("simulate", () => {
  it("buys units on SIP dates and pays dividends on units held", () => {
    const r = simulate(
      [
        { date: "2025-01-10", type: "SIP", amount: 1000 },
        { date: "2025-02-10", type: "SIP", amount: 1000 },
      ],
      [
        { date: "2025-01-01", nav: 10 },
        { date: "2025-02-01", nav: 20 },
        { date: "2025-03-01", nav: 20 },
      ],
      [{ date: "2025-01-20", cashPct: 10 }],
    );
    expect(r.units).toBeCloseTo(150);
    expect(r.cashDividends).toBeCloseTo(100); // 10% of Rs 10 × 100 units
    expect(r.value).toBeCloseTo(3000);
    expect(r.gain).toBeCloseTo(1100);
    expect(r.missingDates).toEqual([]);
  });
});

describe("assemble", () => {
  const funds = [
    ["code", "name", "manager", "type", "units_held", "current_nav", "nav_date", "active"],
    ["NIBLSF", "NIBL", "", "open", "", 10, "2026-09-16", true],
    ["NFCF", "Nabil", "", "open", "", 10, "2026-09-16", true],
    ["KSLY", "Kumari", "", "open", "", 11, "2026-09-16", false],
  ];
  const fundTab = (rows: unknown[][]) => [["id", "date", "type", "amount", "nav", "units", "note"], ...rows];

  it("reads per-fund tabs and doesn't double count the legacy tab", () => {
    const d = assemble({
      funds: funds as never,
      NIBLSF: fundTab([["1", "2025-05-11", "SIP", 5000, 10.84, 460.79, ""]]) as never,
      transactions: [
        ["id", "fund_code", "date", "type", "amount", "nav", "units", "note"],
        ["1", "NIBLSF", "2025-05-11", "SIP", 5000, 10.84, 460.79, ""],
        ["2", "NFCF", "2026-08-03", "SIP", 5000, 10.43, 478, ""],
      ] as never,
    });
    expect(d.transactions.map((t) => t.fundCode)).toEqual(["NIBLSF", "NFCF"]);
    expect(d.legacyRows).toBe(1);
    expect(d.missingFundTabs).toEqual([]);
    expect(d.navHistory.NIBLSF.map((p) => p.date)).toEqual(["2025-05-11", "2026-09-16"]);
  });

  it("flags active funds with no tab", () => {
    const d = assemble({ funds: funds as never });
    expect(d.missingFundTabs).toEqual(["NIBLSF", "NFCF"]);
  });
});
