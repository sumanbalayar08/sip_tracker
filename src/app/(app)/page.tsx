import Link from "next/link";
import { Suspense } from "react";
import { ChevronRight, TriangleAlert } from "lucide-react";
import { getSheetData } from "@/lib/data";
import { portfolioMetrics } from "@/lib/metrics";
import { requireSession } from "@/lib/session";
import { formatNav, formatPct, formatRs, formatUnits, signed } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FundAvatar } from "@/components/fund-avatar";
import { PageHeader } from "@/components/page-header";
import { SheetError } from "@/components/sheet-error";
import { NavChartCard } from "./nav-chart-card";
import { TransactionsCard } from "./transactions-card";

export default function Home() {
  return (
    <Suspense fallback={<OverviewSkeleton />}>
      <Overview />
    </Suspense>
  );
}

function OverviewSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-12 w-64" />
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-96" />
    </div>
  );
}

async function Overview() {
  await requireSession();
  const result = await getSheetData();
  if (!result.ok) return <SheetError error={result.error} />;
  const data = result.data;
  const p = portfolioMetrics(data.funds, data.transactions, data.settings.fdRate);
  const names = Object.fromEntries(data.funds.map((f) => [f.code, f.name || f.code]));

  const warnings: React.ReactNode[] = [];
  if (data.legacyRows > 0)
    warnings.push(
      <>
        {data.legacyRows} row(s) are still in the old <b>transactions</b> tab. Run <code>pnpm sheet:split</code>.
      </>,
    );
  if (data.missingFundTabs.length > 0)
    warnings.push(
      <>
        No transactions tab yet for {data.missingFundTabs.join(", ")}. Run <code>pnpm sheet:init</code>.
      </>,
    );
  for (const m of p.funds)
    if (m.unitsSource === "sheet" && m.txUnits > 0 && Math.abs(m.units - m.txUnits) / m.txUnits > 0.02)
      warnings.push(
        <>
          {m.fund.code}: units_held is {formatUnits(m.units)} but its transactions add up to {formatUnits(m.txUnits)}.
        </>,
      );
  if (data.skippedRows > 0)
    warnings.push(<>{data.skippedRows} transaction row(s) were skipped: each needs a date, a type and an amount.</>);

  const holdingCodes = p.funds.map((m) => m.fund.code);
  const chartFunds = data.funds
    .filter((f) => (data.navHistory[f.code]?.length ?? 0) > 1)
    .map((f) => ({ code: f.code, name: f.name || f.code, held: f.active }));

  return (
    <>
      <PageHeader
        title="Portfolio"
        description={
          <>
            Total value across all funds: {formatRs(p.value)} · {formatRs(p.invested)} invested
          </>
        }
      />

      {warnings.length > 0 && (
        <Alert className="border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
          <TriangleAlert />
          <AlertTitle>Check your sheet</AlertTitle>
          <AlertDescription className="text-amber-900/80 dark:text-amber-100/80">
            <ul className="list-disc pl-4">
              {warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-6 xl:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {p.funds.map((m) => (
              <Link key={m.fund.code} href={`/transactions?fund=${m.fund.code}`} className="group">
                <Card className="h-full py-4 transition-colors group-hover:bg-accent/50">
                  <CardContent className="flex items-center gap-3 px-4">
                    <FundAvatar code={m.fund.code} />
                    <div className="min-w-0 flex-1">
                      <div className="num text-xl font-semibold tracking-tight">{formatRs(m.value)}</div>
                      <div className="truncate text-xs text-muted-foreground">{m.fund.name}</div>
                      <div className={cn("num text-xs", m.gain >= 0 ? "text-positive" : "text-negative")}>
                        {signed(formatRs(m.gain), m.gain)} ({formatPct(m.absoluteReturn)})
                      </div>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </CardContent>
                </Card>
              </Link>
            ))}
            <Link href="/projection" className="group">
              <Card className="h-full py-4 transition-colors group-hover:bg-accent/50">
                <CardContent className="flex items-center gap-3 px-4">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-muted-foreground">XIRR (annual)</div>
                    <div className="num text-xl font-semibold tracking-tight">{formatPct(p.xirr)}</div>
                    <Badge
                      variant="outline"
                      className={cn("num mt-1", p.beatsFd ? "text-positive" : "text-negative")}
                    >
                      {p.beatsFd ? "Beats" : "Below"} FD {formatPct(p.fdRate)}
                    </Badge>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </CardContent>
              </Card>
            </Link>
          </div>

          <TransactionsCard transactions={data.transactions} funds={holdingCodes} names={names} />
        </div>

        <NavChartCard funds={chartFunds} navHistory={data.navHistory} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Funds</CardTitle>
          <CardDescription>Units × latest NAV. Gain includes cash dividends you recorded.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table className="num">
            <TableHeader>
              <TableRow>
                <TableHead>Fund</TableHead>
                <TableHead className="text-right">Units</TableHead>
                <TableHead className="text-right">NAV</TableHead>
                <TableHead className="text-right">Invested</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="text-right">Gain</TableHead>
                <TableHead className="text-right">XIRR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {p.funds.map((m) => (
                <TableRow key={m.fund.code}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <FundAvatar code={m.fund.code} className="size-8" />
                      <div>
                        <div className="font-medium">{m.fund.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {m.fund.code}
                          {m.firstDate && ` · since ${m.firstDate}`}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{formatUnits(m.units)}</TableCell>
                  <TableCell className="text-right">
                    {formatNav(m.fund.currentNav)}
                    <div className="text-xs text-muted-foreground">{m.fund.navDate}</div>
                  </TableCell>
                  <TableCell className="text-right">{formatRs(m.invested)}</TableCell>
                  <TableCell className="text-right font-medium">{formatRs(m.value)}</TableCell>
                  <TableCell className={cn("text-right", m.gain >= 0 ? "text-positive" : "text-negative")}>
                    {signed(formatRs(m.gain), m.gain)}
                    <div className="text-xs">{formatPct(m.absoluteReturn)}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatPct(m.xirr)}
                    <div className={cn("text-xs", m.beatsFd ? "text-positive" : "text-negative")}>
                      {m.beatsFd === null ? "" : m.beatsFd ? "Beats FD" : "Below FD"}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
