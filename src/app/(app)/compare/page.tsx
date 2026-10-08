import type { Metadata } from "next";
import { Suspense } from "react";
import { getSheetData } from "@/lib/data";
import { requireSession } from "@/lib/session";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { SheetError } from "@/components/sheet-error";
import { WhatIf } from "./what-if";

export const metadata: Metadata = { title: "Compare · SIP Tracker" };

export default function ComparePage() {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <Compare />
    </Suspense>
  );
}

async function Compare() {
  await requireSession();
  const result = await getSheetData();
  if (!result.ok) return <SheetError error={result.error} />;
  const { funds, transactions, navHistory, dividends, settings } = result.data;
  return (
    <>
      <PageHeader
        title="Compare funds"
        description="What your SIPs would be worth now if every one had gone into a different fund."
      />
      <WhatIf
      funds={funds}
      transactions={transactions}
      navHistory={navHistory}
      dividends={dividends}
      fdRate={settings.fdRate}
      />
    </>
  );
}
