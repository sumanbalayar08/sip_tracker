"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import type { Dividend, Fund, NavPoint, Transaction } from "@/lib/schema";
import { portfolioMetrics } from "@/lib/metrics";
import { simulate } from "@/lib/whatif";
import { formatPct, formatRs, signed } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FundAvatar } from "@/components/fund-avatar";

type Props = {
  funds: Fund[];
  transactions: Transaction[];
  navHistory: Record<string, NavPoint[]>;
  dividends: Dividend[];
  fdRate: number;
};

export function WhatIf({ funds, transactions, navHistory, dividends, fdRate }: Props) {
  const holdings = funds.filter((f) => f.active);
  const [scope, setScope] = useState<string>("ALL");

  const scopedFunds = scope === "ALL" ? holdings : holdings.filter((f) => f.code === scope);
  const scopedTx = transactions.filter((t) => scopedFunds.some((f) => f.code === t.fundCode));
  const actual = portfolioMetrics(scopedFunds, scopedTx, fdRate);
  const actualTotal = actual.gain + actual.invested;

  // "Ends with" = everything the money turned into: current value + dividends + anything redeemed.
  const trades = scopedTx.filter((t) => t.type === "SIP" || t.type === "REDEEM");
  const rows = funds
    .filter((f) => (navHistory[f.code]?.length ?? 0) > 0)
    .map((f) => {
      const r = simulate(trades, navHistory[f.code], dividends.filter((d) => d.fundCode === f.code));
      return { fund: f, r, total: r.gain + r.invested };
    })
    .sort(
      (a, b) =>
        Number(b.r.missingDates.length === 0) - Number(a.r.missingDates.length === 0) || b.total - a.total,
    );
  const noNav = funds.filter((f) => !navHistory[f.code]?.length);
  const sipCount = scopedTx.filter((t) => t.type === "SIP").length;

  return (
    <div className="flex flex-col gap-6">
      <Card className="gap-0 pb-0">
        <CardHeader className="pb-4">
          <CardTitle>What if you&apos;d picked a different fund?</CardTitle>
          <CardDescription className="num">
            {sipCount} SIPs · {formatRs(actual.invested)}
            {scopedTx[0] && ` · since ${scopedTx[0].date}`}
          </CardDescription>
          <CardAction>
            <Select value={scope} onValueChange={setScope}>
              <SelectTrigger className="w-52" aria-label="Which SIPs to replay">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="ALL">All my SIPs</SelectItem>
                {holdings.map((f) => (
                  <SelectItem key={f.code} value={f.code}>
                    My {f.code} SIPs
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardAction>
        </CardHeader>
        <CardContent className="px-0">
          {scopedTx.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">No SIPs to replay yet.</p>
          ) : (
            <Table className="num">
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Fund</TableHead>
                  <TableHead className="text-right">Ends with</TableHead>
                  <TableHead className="text-right">Gain</TableHead>
                  <TableHead className="text-right">XIRR</TableHead>
                  <TableHead className="pr-6 text-right">vs yours</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableCell className="pl-6">
                    <div className="font-medium">Your actual portfolio</div>
                    <div className="text-xs text-muted-foreground">Real purchase NAVs, current units, recorded dividends</div>
                  </TableCell>
                  <TableCell className="text-right font-semibold">{formatRs(actualTotal)}</TableCell>
                  <GainCells gain={actual.gain} pct={actual.absoluteReturn} xirr={actual.xirr} />
                  <TableCell className="pr-6 text-right text-muted-foreground">–</TableCell>
                </TableRow>
                {rows.map(({ fund, r, total }) => {
                  const diff = total - actualTotal;
                  const incomplete = r.missingDates.length > 0;
                  return (
                    <TableRow key={fund.code} className={incomplete ? "opacity-60" : ""}>
                      <TableCell className="pl-6 whitespace-normal">
                        <div className="flex items-center gap-3">
                          <FundAvatar code={fund.code} className="size-8" />
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2 font-medium">
                              {fund.name || fund.code}
                              {fund.active && <Badge variant="secondary">You hold</Badge>}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {fund.code}
                              {r.latest && ` · NAV ${r.latest.nav.toFixed(2)} on ${r.latest.date}`}
                              {r.cashDividends > 0 && ` · ${formatRs(r.cashDividends)} dividends`}
                            </div>
                            {incomplete && (
                              <div className="text-xs text-negative">
                                No NAV for {r.missingDates.length} SIP date(s): add NAVs to nav_history
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatRs(total)}</TableCell>
                      <GainCells gain={r.gain} pct={r.invested ? r.gain / r.invested : null} xirr={r.xirr} />
                      <TableCell className="pr-6 text-right">
                        {incomplete ? (
                          "–"
                        ) : (
                          <Badge
                            variant="outline"
                            className={cn(diff >= 0 ? "border-positive/30 text-positive" : "border-negative/30 text-negative")}
                          >
                            {signed(formatRs(diff), diff)}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Alert>
        <Info />
        <AlertDescription>
          <ul className="list-disc pl-4">
            <li>
              Each row buys the same amounts on the same dates at that fund&apos;s NAV (the last month-end NAV in
              nav_history when the exact day isn&apos;t there). Results are a guide, not exact.
            </li>
            <li>Cash dividends from the dividends tab count as money received.</li>
            <li>If a fund you hold shows more here than your actual row, check its tab for a missing DIV_CASH dividend.</li>
            <li>
              To compare another fund, add it to the funds tab with active = FALSE and its month-end NAVs to nav_history.
            </li>
            {noNav.length > 0 && <li>No NAV history yet for: {noNav.map((f) => f.code).join(", ")}.</li>}
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}

function GainCells({ gain, pct, xirr }: { gain: number; pct: number | null; xirr: number | null }) {
  return (
    <>
      <TableCell className={cn("text-right", gain >= 0 ? "text-positive" : "text-negative")}>
        {signed(formatRs(gain), gain)}
        <div className="text-xs">{formatPct(pct)}</div>
      </TableCell>
      <TableCell className="text-right">{formatPct(xirr)}</TableCell>
    </>
  );
}
