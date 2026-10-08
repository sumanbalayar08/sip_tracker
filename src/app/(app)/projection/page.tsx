import type { Metadata } from "next";
import { Suspense } from "react";
import { getSheetData } from "@/lib/data";
import { portfolioMetrics } from "@/lib/metrics";
import { requireSession } from "@/lib/session";
import { currentMonthlySip } from "@/lib/sip";
import { SheetError } from "@/components/sheet-error";
import { ProjectionPlanner, type PlannerFund } from "./planner";

export const metadata: Metadata = { title: "Projection · SIP Tracker" };

export default function ProjectionPage() {
  return (
    <Suspense fallback={<p className="text-ink-muted">Loading…</p>}>
      <Projection />
    </Suspense>
  );
}

async function Projection() {
  await requireSession();
  const result = await getSheetData();
  if (!result.ok) return <SheetError error={result.error} />;
  const { funds, transactions, settings } = result.data;
  const p = portfolioMetrics(funds, transactions, settings.fdRate);
  const planFunds: PlannerFund[] = p.funds.map((m) => ({
    code: m.fund.code,
    name: m.fund.name || m.fund.code,
    value: m.value,
    invested: m.invested,
    monthlySip: currentMonthlySip(m.fund, transactions, settings),
  }));
  return (
    <ProjectionPlanner
      funds={planFunds}
      defaults={{
        years: settings.horizonYears,
        scenarios: settings.scenarios,
        stepUp: settings.stepUp,
        inflation: settings.inflation,
        fdRate: settings.fdRate,
      }}
    />
  );
}
