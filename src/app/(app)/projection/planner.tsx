"use client";

import { useState } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { project } from "@/lib/projection";
import { formatPct, formatRs, formatRsShort } from "@/lib/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export type PlannerFund = { code: string; name: string; value: number; invested: number; monthlySip: number };

type Defaults = {
  years: number;
  scenarios: [number, number, number];
  stepUp: number;
  inflation: number;
  fdRate: number;
};

const HORIZONS = [20, 25, 30, 35];
const NAMES = ["Conservative", "Expected", "Optimistic"] as const;
const KEYS = ["s0", "s1", "s2"] as const;
const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)"];
const pctIn = (v: number) => +(v * 100).toFixed(2);

export function ProjectionPlanner({ funds, defaults }: { funds: PlannerFund[]; defaults: Defaults }) {
  const [years, setYears] = useState(HORIZONS.includes(defaults.years) ? defaults.years : 30);
  const [sips, setSips] = useState<Record<string, number>>(() =>
    Object.fromEntries(funds.map((f) => [f.code, f.monthlySip])),
  );
  const [stepUp, setStepUp] = useState(pctIn(defaults.stepUp));
  const [inflation, setInflation] = useState(pctIn(defaults.inflation));
  const [rates, setRates] = useState(defaults.scenarios.map(pctIn));

  const startValue = funds.reduce((s, f) => s + f.value, 0);
  const startInvested = funds.reduce((s, f) => s + f.invested, 0);
  const monthlySip = funds.reduce((s, f) => s + (sips[f.code] || 0), 0);

  const series = rates.map((r) =>
    project({
      startValue,
      startInvested,
      monthlySip,
      annualReturn: (r || 0) / 100,
      years,
      stepUp: (stepUp || 0) / 100,
      inflation: (inflation || 0) / 100,
    }),
  );
  const end = series.map((s) => s[s.length - 1]);
  const chartData = series[0].map((p, i) => ({
    year: p.year,
    invested: p.invested,
    s0: series[0][i].value,
    s1: series[1][i].value,
    s2: series[2][i].value,
  }));
  const config = {
    invested: { label: "Invested", color: "var(--muted-foreground)" },
    ...Object.fromEntries(KEYS.map((k, i) => [k, { label: `${NAMES[i]} ${rates[i]}%`, color: COLORS[i] }])),
  } satisfies ChartConfig;
  const milestones = series[1].filter((p) => p.year > 0 && (p.year % 5 === 0 || p.year === years));

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-3">
        {end.map((p, i) => (
          <Card key={i} className="gap-2">
            <CardHeader>
              <CardDescription className="flex items-center gap-2">
                <span aria-hidden className="size-2.5 rounded-sm" style={{ background: COLORS[i] }} />
                {NAMES[i]} · {rates[i]}% a year
              </CardDescription>
              <CardTitle className="num text-3xl font-semibold tracking-tight">{formatRsShort(p.value)}</CardTitle>
            </CardHeader>
            <CardContent className="num text-sm text-muted-foreground">
              {formatRsShort(p.realValue)} in today&apos;s money · after {years} years
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Assumptions</CardTitle>
            <CardDescription>Defaults come from the settings tab.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="grid gap-2">
              <Label>Horizon</Label>
              <ToggleGroup
                type="single"
                variant="outline"
                value={String(years)}
                onValueChange={(v) => v && setYears(Number(v))}
                className="w-full"
              >
                {HORIZONS.map((h) => (
                  <ToggleGroupItem key={h} value={String(h)} className="flex-1">
                    {h}y
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
            {funds.map((f) => (
              <Field key={f.code} id={`sip-${f.code}`} label={`${f.code} monthly SIP (Rs)`}>
                <NumberInput
                  id={`sip-${f.code}`}
                  value={sips[f.code] ?? 0}
                  step={500}
                  onChange={(v) => setSips((s) => ({ ...s, [f.code]: v }))}
                />
              </Field>
            ))}
            <div className="grid grid-cols-2 gap-3">
              <Field id="stepup" label="Step-up %/yr">
                <NumberInput id="stepup" value={stepUp} step={1} onChange={setStepUp} />
              </Field>
              <Field id="inflation" label="Inflation %/yr">
                <NumberInput id="inflation" value={inflation} step={0.5} onChange={setInflation} />
              </Field>
            </div>
            <Separator />
            <div className="grid grid-cols-3 gap-3">
              {NAMES.map((n, i) => (
                <Field key={n} id={`rate-${i}`} label={`${n.slice(0, 5)}. %`}>
                  <NumberInput
                    id={`rate-${i}`}
                    value={rates[i]}
                    step={0.5}
                    onChange={(v) => setRates((r) => r.map((x, j) => (j === i ? v : x)))}
                  />
                </Field>
              ))}
            </div>
            <p className="num text-sm text-muted-foreground">
              From {formatRs(startValue)} today, adding {formatRs(monthlySip)} a month. Returns assume dividends are
              reinvested; NIBL Sahabhagita has returned about 8% a year since 2019, and FDs pay about{" "}
              {formatPct(defaults.fdRate)}.
            </p>
          </CardContent>
        </Card>

        <Card className="min-w-0 xl:col-span-2">
          <CardHeader>
            <CardTitle>Projected value</CardTitle>
            <CardDescription className="num">
              You&apos;d put in {formatRsShort(end[0].invested)} over {years} years.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={config} className="aspect-auto h-[26rem] w-full">
              <LineChart data={chartData} margin={{ left: 4, right: 12, top: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="year"
                  tickLine={false}
                  axisLine={false}
                  ticks={chartData.filter((d) => d.year % 5 === 0).map((d) => d.year)}
                  tickFormatter={(y: number) => (y === 0 ? "Now" : `Yr ${y}`)}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={52}
                  tickFormatter={(v: number) => (v >= 1e7 ? `${+(v / 1e7).toFixed(1)} Cr` : v >= 1e5 ? `${Math.round(v / 1e5)} L` : `${v}`)}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(_, payload) => `Year ${payload?.[0]?.payload?.year ?? ""}`}
                      formatter={(value, name, item) => (
                        <div className="flex w-full items-center justify-between gap-4">
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <span className="size-2 rounded-[2px]" style={{ background: item.color }} />
                            {config[name as keyof typeof config]?.label ?? name}
                          </span>
                          <span className="num font-medium text-foreground">{formatRsShort(Number(value))}</span>
                        </div>
                      )}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Line dataKey="invested" stroke="var(--color-invested)" strokeDasharray="5 4" strokeWidth={2} dot={false} />
                {KEYS.map((k) => (
                  <Line key={k} dataKey={k} stroke={`var(--color-${k})`} strokeWidth={2} dot={false} />
                ))}
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Milestones</CardTitle>
          <CardDescription>Every five years, nominal rupees.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table className="num">
            <TableHeader>
              <TableRow>
                <TableHead>Year</TableHead>
                <TableHead className="text-right">Invested</TableHead>
                {NAMES.map((n, i) => (
                  <TableHead key={n} className="text-right">
                    {n} {rates[i]}%
                  </TableHead>
                ))}
                <TableHead className="text-right">Expected, today&apos;s Rs</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {milestones.map((m) => (
                <TableRow key={m.year}>
                  <TableCell>{m.year}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{formatRsShort(m.invested)}</TableCell>
                  {series.map((s, i) => (
                    <TableCell key={i} className={i === 1 ? "text-right font-medium" : "text-right"}>
                      {formatRsShort(s[m.year].value)}
                    </TableCell>
                  ))}
                  <TableCell className="text-right text-muted-foreground">{formatRsShort(m.realValue)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="grid min-w-0 gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function NumberInput({ id, value, step, onChange }: { id: string; value: number; step: number; onChange: (v: number) => void }) {
  return (
    <Input
      id={id}
      type="number"
      inputMode="decimal"
      min={0}
      step={step}
      className="num"
      value={Number.isFinite(value) ? value : ""}
      onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
    />
  );
}
