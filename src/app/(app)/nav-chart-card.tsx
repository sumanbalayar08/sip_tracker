"use client";

import Link from "next/link";
import { useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import type { NavPoint } from "@/lib/schema";
import { formatNav } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const RANGES = { "6M": 182, "1Y": 365, ALL: Infinity } as const;
type Range = keyof typeof RANGES;

const config = { nav: { label: "NAV", color: "var(--chart-2)" } } satisfies ChartConfig;

export function NavChartCard({
  funds,
  navHistory,
}: {
  funds: { code: string; name: string; held: boolean }[];
  navHistory: Record<string, NavPoint[]>;
}) {
  const [code, setCode] = useState(funds.find((f) => f.held)?.code ?? funds[0]?.code ?? "");
  const [range, setRange] = useState<Range>("1Y");
  const all = navHistory[code] ?? [];
  const last = all[all.length - 1];
  const cutoff = last ? new Date(Date.parse(last.date) - RANGES[range] * 86_400_000).toISOString().slice(0, 10) : "";
  const pts = range === "ALL" ? all : all.filter((p) => p.date >= cutoff);
  const first = pts[0];
  const change = first && last ? last.nav / first.nav - 1 : null;
  const held = funds.filter((f) => f.held);
  const others = funds.filter((f) => !f.held);

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle>NAV history</CardTitle>
        <CardDescription className="num">
          {last ? `Latest ${formatNav(last.nav)} on ${last.date}` : "Add NAVs to nav_history"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Select value={code} onValueChange={setCode}>
          <SelectTrigger className="w-full" aria-label="Fund">
            <SelectValue placeholder="Choose a fund" />
          </SelectTrigger>
          <SelectContent>
            {held.length > 0 && (
              <SelectGroup>
                <SelectLabel>Your funds</SelectLabel>
                {held.map((f) => (
                  <SelectItem key={f.code} value={f.code}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            )}
            {others.length > 0 && (
              <SelectGroup>
                <SelectLabel>Comparison funds</SelectLabel>
                {others.map((f) => (
                  <SelectItem key={f.code} value={f.code}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            )}
          </SelectContent>
        </Select>
        <div className="flex items-center justify-between gap-2">
          <ToggleGroup
            type="single"
            size="sm"
            variant="outline"
            value={range}
            onValueChange={(v) => v && setRange(v as Range)}
          >
            {(Object.keys(RANGES) as Range[]).map((r) => (
              <ToggleGroupItem key={r} value={r} className="px-3">
                {r === "ALL" ? "All" : r}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          {change !== null && (
            <span className={`num text-sm font-medium ${change >= 0 ? "text-positive" : "text-negative"}`}>
              {change >= 0 ? "+" : ""}
              {(change * 100).toFixed(1)}%
            </span>
          )}
        </div>
        <ChartContainer config={config} className="aspect-auto h-56 w-full">
          <AreaChart data={pts} margin={{ left: 0, right: 8, top: 8 }}>
            <defs>
              <linearGradient id="navFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-nav)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--color-nav)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              minTickGap={28}
              tickFormatter={(d: string) => new Date(d).toLocaleDateString("en-GB", { month: "short", year: "2-digit" })}
            />
            <YAxis
              domain={["auto", "auto"]}
              tickLine={false}
              axisLine={false}
              width={36}
              tickFormatter={(v: number) => v.toFixed(1)}
            />
            <ChartTooltip cursor content={<ChartTooltipContent indicator="line" />} />
            <Area dataKey="nav" type="monotone" stroke="var(--color-nav)" strokeWidth={2} fill="url(#navFill)" dot={false} />
          </AreaChart>
        </ChartContainer>
        <p className="text-xs text-muted-foreground">
          NAV alone understates returns: these funds pay most gains out as dividends, which drops the NAV.
        </p>
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        <Button className="w-full" asChild>
          <Link href="/projection">Project 30 years</Link>
        </Button>
        <Button variant="outline" className="w-full" asChild>
          <Link href="/compare">Compare with other funds</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
