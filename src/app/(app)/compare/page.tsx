import type { Metadata } from "next";
import { Suspense } from "react";
import { getSheetData } from "@/lib/data";
import { requireSession } from "@/lib/session";
import { SheetError } from "@/components/sheet-error";
import { WhatIf } from "./what-if";

export const metadata: Metadata = { title: "Compare · SIP Tracker" };

export default function ComparePage() {
  return (
    <Suspense fallback={<p className="text-ink-muted">Loading…</p>}>
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
    <WhatIf
      funds={funds}
      transactions={transactions}
      navHistory={navHistory}
      dividends={dividends}
      fdRate={settings.fdRate}
    />
  );
}
