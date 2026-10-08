import type { Metadata } from "next";
import { Suspense } from "react";
import { getSheetData } from "@/lib/data";
import { portfolioMetrics } from "@/lib/metrics";
import { requireSession } from "@/lib/session";
import { currentMonthlySip } from "@/lib/sip";
import { formatRs } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { SheetError } from "@/components/sheet-error";
import { ProjectionPlanner, type PlannerFund } from "./planner";

export const metadata: Metadata = { title: "Projection · SIP Tracker" };

export default function ProjectionPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
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
    <>
      <PageHeader
        title="Projection"
        description={<>What today&apos;s {formatRs(p.value)} and your monthly SIPs could grow to.</>}
      />
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
    </>
  );
}
