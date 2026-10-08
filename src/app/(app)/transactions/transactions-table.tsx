"use client";

import { useState } from "react";
import type { Transaction } from "@/lib/schema";
import { formatNav, formatRs, formatUnits } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FundAvatar } from "@/components/fund-avatar";

const TYPE: Record<Transaction["type"], { label: string; className: string }> = {
  SIP: { label: "SIP", className: "" },
  DIV_CASH: { label: "Dividend", className: "text-positive border-positive/30" },
  DIV_REINVEST: { label: "Reinvested", className: "text-positive border-positive/30" },
  REDEEM: { label: "Redeemed", className: "text-negative border-negative/30" },
};

export function TransactionsTable({
  transactions,
  funds,
  initial,
}: {
  transactions: Transaction[];
  funds: { code: string; name: string }[];
  initial: string;
}) {
  const [tab, setTab] = useState(initial);
  const name = Object.fromEntries(funds.map((f) => [f.code, f.name]));
  const rows = transactions.filter((t) => tab === "ALL" || t.fundCode === tab).slice().reverse();
  const invested = rows.filter((t) => t.type === "SIP").reduce((s, t) => s + t.amount, 0);
  const units = rows.reduce(
    (s, t) => s + (t.units === null ? 0 : t.type === "REDEEM" ? -t.units : t.type === "DIV_CASH" ? 0 : t.units),
    0,
  );

  return (
    <div className="flex flex-col gap-4">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="ALL">All funds</TabsTrigger>
          {funds.map((f) => (
            <TabsTrigger key={f.code} value={f.code}>
              {f.code}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <Card className="py-0">
        <CardContent className="px-0">
          <Table className="num">
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Date</TableHead>
                <TableHead>Fund</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">NAV</TableHead>
                <TableHead className="text-right">Units</TableHead>
                <TableHead className="pr-6">Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    No transactions yet.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((t, i) => (
                <TableRow key={`${t.id}-${i}`}>
                  <TableCell className="pl-6 text-muted-foreground">{t.date}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FundAvatar code={t.fundCode} className="size-7 text-[10px]" />
                      <span className="font-medium">{name[t.fundCode] ?? t.fundCode}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={TYPE[t.type].className}>
                      {TYPE[t.type].label}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className={cn("text-right", (t.type === "DIV_CASH" || t.type === "REDEEM") && "text-positive")}
                  >
                    {formatRs(t.amount)}
                  </TableCell>
                  <TableCell className="text-right">{t.nav === null ? "–" : formatNav(t.nav)}</TableCell>
                  <TableCell className="text-right">{t.units === null ? "–" : formatUnits(t.units)}</TableCell>
                  <TableCell className="max-w-48 truncate pr-6 text-muted-foreground">{t.note}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            {rows.length > 0 && (
              <TableFooter>
                <TableRow>
                  <TableCell className="pl-6" colSpan={3}>
                    {rows.length} transactions
                  </TableCell>
                  <TableCell className="text-right">{formatRs(invested)} in SIPs</TableCell>
                  <TableCell />
                  <TableCell className="text-right">{formatUnits(units)}</TableCell>
                  <TableCell className="pr-6" />
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
