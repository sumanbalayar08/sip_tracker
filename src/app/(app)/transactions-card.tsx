"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Transaction } from "@/lib/schema";
import { formatNav, formatRs, formatUnits } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TYPE_LABEL: Record<Transaction["type"], string> = {
  SIP: "SIP instalment",
  DIV_CASH: "Cash dividend",
  DIV_REINVEST: "Dividend reinvested",
  REDEEM: "Redemption",
};

export function TransactionsCard({
  transactions,
  funds,
  names,
}: {
  transactions: Transaction[];
  funds: string[];
  names: Record<string, string>;
}) {
  const tabs = ["ALL", ...funds];
  return (
    <Card className="gap-0 overflow-hidden pb-0">
      <CardHeader className="pb-4">
        <CardTitle>Transactions</CardTitle>
        <CardDescription>Latest entries from your fund tabs</CardDescription>
        <CardAction>
          <Button variant="outline" size="sm" asChild>
            <Link href="/transactions">
              All <ChevronRight />
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <Tabs defaultValue="ALL" className="gap-0">
        <TabsList className="h-auto w-full justify-start rounded-none border-b bg-transparent px-6 py-0">
          {tabs.map((t) => (
            <TabsTrigger
              key={t}
              value={t}
              className="flex-none rounded-none border-0 border-b-2 border-transparent px-3 py-2 data-[state=active]:border-foreground data-[state=active]:shadow-none dark:data-[state=active]:border-foreground dark:data-[state=active]:bg-transparent"
            >
              {t === "ALL" ? "Latest" : t}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabs.map((t) => {
          const rows = transactions
            .filter((x) => t === "ALL" || x.fundCode === t)
            .slice(-7)
            .reverse();
          return (
            <TabsContent key={t} value={t}>
              {rows.length === 0 ? (
                <p className="px-6 py-10 text-center text-sm text-muted-foreground">
                  No transactions yet. Add rows to the {t === "ALL" ? "fund" : t} tab in your sheet.
                </p>
              ) : (
                <ul className="divide-y">
                  {rows.map((x, i) => {
                    const inflow = x.type === "DIV_CASH" || x.type === "REDEEM";
                    return (
                      <li key={`${x.id}-${i}`} className="num flex items-center gap-4 px-6 py-3 text-sm">
                        <span className="hidden w-24 shrink-0 text-muted-foreground sm:block">{x.date}</span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium">
                            <span className="sm:hidden">{x.fundCode} · {TYPE_LABEL[x.type]}</span>
                            <span className="hidden sm:inline">{TYPE_LABEL[x.type]} · {names[x.fundCode] ?? x.fundCode}</span>
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            <span className="sm:hidden">{x.date} · </span>
                            {x.units !== null && `${formatUnits(x.units)} units`}
                            {x.nav !== null && ` @ ${formatNav(x.nav)}`}
                            {x.note && ` · ${x.note}`}
                          </div>
                        </div>
                        <span className={cn("shrink-0 text-right", inflow ? "text-positive" : "")}>
                          {inflow ? "+" : ""}
                          {formatRs(x.amount)}
                        </span>
                        <Button variant="outline" size="icon" className="hidden size-7 sm:inline-flex" asChild>
                          <Link href={`/transactions?fund=${x.fundCode}`} aria-label={`All ${x.fundCode} transactions`}>
                            <ChevronRight />
                          </Link>
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </Card>
  );
}
