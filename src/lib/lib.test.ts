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
