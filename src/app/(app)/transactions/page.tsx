import type { Metadata } from "next";
import { Suspense } from "react";
import { getSheetData } from "@/lib/data";
import { requireSession } from "@/lib/session";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { SheetError } from "@/components/sheet-error";
import { TransactionsTable } from "./transactions-table";

export const metadata: Metadata = { title: "Transactions · SIP Tracker" };

export default function TransactionsPage({ searchParams }: PageProps<"/transactions">) {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <Transactions searchParams={searchParams} />
    </Suspense>
  );
}

async function Transactions({ searchParams }: { searchParams: PageProps<"/transactions">["searchParams"] }) {
  await requireSession();
  const fundParam = (await searchParams).fund;
  const result = await getSheetData();
  if (!result.ok) return <SheetError error={result.error} />;
  const { funds, transactions } = result.data;
  const holdings = funds.filter((f) => f.active).map((f) => ({ code: f.code, name: f.name || f.code }));
  const initial = typeof fundParam === "string" && holdings.some((h) => h.code === fundParam) ? fundParam : "ALL";
  return (
    <>
      <PageHeader
        title="Transactions"
        description="Every SIP, dividend and redemption from your fund tabs. Edit them in the Google Sheet."
      />
      <TransactionsTable key={initial} transactions={transactions} funds={holdings} initial={initial} />
    </>
  );
}
