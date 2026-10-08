"use client";

import { useMemo, useState } from "react";
import { project, type ProjectionPoint } from "@/lib/projection";
import { formatPct, formatRs, formatRsShort } from "@/lib/format";

export type PlannerFund = { code: string; name: string; value: number; invested: number; monthlySip: number };

type Defaults = {
  years: number;
  scenarios: [number, number, number];
  stepUp: number;
  inflation: number;
  fdRate: number;
};

const HORIZONS = [20, 25, 30, 35] as const;
const SCENARIO_NAMES = ["Conservative", "Expected", "Optimistic"] as const;
const SERIES_VARS = ["var(--series-1)", "var(--series-2)", "var(--series-3)"] as const;

const pctIn = (v: number) => +(v * 100).toFixed(2);

export function ProjectionPlanner({ funds, defaults }: { funds: PlannerFund[]; defaults: Defaults }) {
  const [years, setYears] = useState(HORIZONS.includes(defaults.years as 30) ? defaults.years : 30);
  const [sips, setSips] = useState<Record<string, number>>(() =>
    Object.fromEntries(funds.map((f) => [f.code, f.monthlySip])),
  );
  const [stepUp, setStepUp] = useState(pctIn(defaults.stepUp));
  const [inflation, setInflation] = useState(pctIn(defaults.inflation));
  const [rates, setRates] = useState(defaults.scenarios.map(pctIn));

  const startValue = funds.reduce((s, f) => s + f.value, 0);
  const startInvested = funds.reduce((s, f) => s + f.invested, 0);
  const monthlySip = funds.reduce((s, f) => s + (sips[f.code] || 0), 0);

  const series = useMemo(
    () =>
      rates.map((r) =>
        project({
          startValue,
          startInvested,
          monthlySip,
          annualReturn: (r || 0) / 100,
          years,
          stepUp: (stepUp || 0) / 100,
          inflation: (inflation || 0) / 100,
        }),
      ),
    [rates, startValue, startInvested, monthlySip, years, stepUp, inflation],
  );
  const end = series.map((s) => s[s.length - 1]);
  const milestones = series[1].filter((p) => p.year > 0 && (p.year % 5 === 0 || p.year === years));

  return (
    <div className="flex flex-col gap-8">
      <section className="grid gap-6 rounded-lg border border-line bg-surface p-5 md:grid-cols-2">
        <div className="flex flex-col gap-4">
          <Field label="Horizon">
            <div role="radiogroup" aria-label="Horizon in years" className="flex flex-wrap gap-1">
              {HORIZONS.map((h) => (
                <button
                  key={h}
                  role="radio"
                  aria-checked={years === h}
                  onClick={() => setYears(h)}
                  className={`rounded-md px-3 py-1.5 text-sm ${years === h ? "bg-accent text-on-accent" : "border border-line hover:border-accent"}`}
                >
                  {h} years
                </button>
              ))}
            </div>
          </Field>
          {funds.map((f) => (
            <Field key={f.code} label={`${f.name} — monthly SIP (Rs)`} htmlFor={`sip-${f.code}`}>
              <NumberInput
                id={`sip-${f.code}`}
                value={sips[f.code] ?? 0}
                step={500}
                onChange={(v) => setSips((s) => ({ ...s, [f.code]: v }))}
              />
            </Field>
          ))}
          <p className="num text-sm text-ink-muted">
            Starting from {formatRs(startValue)} today ({formatRs(startInvested)} invested), adding{" "}
            {formatRs(monthlySip)} a month.
          </p>
        </div>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-3">
            {SCENARIO_NAMES.map((n, i) => (
              <Field key={n} label={`${n} %/yr`} htmlFor={`rate-${i}`}>
                <NumberInput
                  id={`rate-${i}`}
                  value={rates[i]}
                  step={0.5}
                  onChange={(v) => setRates((r) => r.map((x, j) => (j === i ? v : x)))}
                />
              </Field>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="SIP step-up %/yr" htmlFor="stepup">
              <NumberInput id="stepup" value={stepUp} step={1} onChange={setStepUp} />
            </Field>
            <Field label="Inflation %/yr" htmlFor="inflation">
              <NumberInput id="inflation" value={inflation} step={0.5} onChange={setInflation} />
            </Field>
          </div>
          <p className="text-sm text-ink-muted">
            Returns assume dividends are reinvested. For reference: NIBL Sahabhagita has returned about 8% a year since
            2019, and fixed deposits pay about {formatPct(defaults.fdRate)}. Defaults come from the <b>settings</b> tab.
          </p>
        </div>
      </section>

      <section aria-label={`Projected value after ${years} years`} className="grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-3">
        {end.map((p, i) => (
          <div key={i} className="flex flex-col gap-1 bg-surface p-4">
            <span className="flex items-center gap-2 text-xs uppercase tracking-wide text-ink-muted">
              <span aria-hidden className="inline-block h-0.5 w-4 rounded" style={{ background: SERIES_VARS[i] }} />
              {SCENARIO_NAMES[i]} · {rates[i]}%
            </span>
            <span className="num text-2xl font-semibold">{formatRsShort(p.value)}</span>
            <span className="num text-sm text-ink-muted">{formatRsShort(p.realValue)} in today&apos;s money</span>
          </div>
        ))}
      </section>
      <p className="num -mt-5 text-sm text-ink-muted">
        You&apos;d put in {formatRsShort(end[0].invested)} in total over {years} years.
      </p>

      <ProjectionChart series={series} names={SCENARIO_NAMES.map((n, i) => `${n} ${rates[i]}%`)} />

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Milestones</h2>
        <div className="overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="num w-full min-w-[640px] text-sm whitespace-nowrap">
            <thead className="text-left text-xs uppercase tracking-wide text-ink-muted">
              <tr className="border-b border-line">
                <th className="px-4 py-2 font-medium">Year</th>
                <th className="px-4 py-2 text-right font-medium">Invested</th>
                {SCENARIO_NAMES.map((n, i) => (
                  <th key={n} className="px-4 py-2 text-right font-medium">
                    {n} {rates[i]}%
                  </th>
                ))}
                <th className="px-4 py-2 text-right font-medium">Expected, today&apos;s Rs</th>
              </tr>
            </thead>
            <tbody>
              {milestones.map((m) => (
                <tr key={m.year} className="border-b border-line last:border-0">
                  <td className="px-4 py-2.5">{m.year}</td>
                  <td className="px-4 py-2.5 text-right text-ink-muted">{formatRsShort(m.invested)}</td>
                  {series.map((s, i) => (
                    <td key={i} className={`px-4 py-2.5 text-right ${i === 1 ? "font-medium" : ""}`}>
                      {formatRsShort(s[m.year].value)}
                    </td>
                  ))}
                  <td className="px-4 py-2.5 text-right text-ink-muted">{formatRsShort(m.realValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-xs font-medium uppercase tracking-wide text-ink-muted">
        {label}
      </label>
      {children}
    </div>
  );
}

function NumberInput({
  id,
  value,
  step,
  onChange,
}: {
  id: string;
  value: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <input
      id={id}
      type="number"
      inputMode="decimal"
      min={0}
      step={step}
      value={Number.isFinite(value) ? value : ""}
      onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
      className="num w-full rounded-md border border-line bg-bg px-3 py-1.5 text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
    />
  );
}

/* ---------- chart ---------- */

const W = 720;
const H = 300;
const PAD = { l: 64, r: 150, t: 16, b: 28 };

function niceStep(max: number) {
  const raw = max / 5;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / mag;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * mag;
}

function ProjectionChart({ series, names }: { series: ProjectionPoint[][]; names: string[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const years = series[0].length - 1;
  const maxV = Math.max(...series.map((s) => s[s.length - 1].value), 1);
  const step = niceStep(maxV);
  const top = Math.ceil(maxV / step) * step;
  const x = (y: number) => PAD.l + (y / years) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - v / top) * (H - PAD.t - PAD.b);
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
  const xTicks = series[0].filter((p) => p.year % 5 === 0).map((p) => p.year);
  const path = (pts: ProjectionPoint[], key: "value" | "invested") =>
    pts.map((p, i) => `${i ? "L" : "M"}${x(p.year).toFixed(1)},${y(p[key]).toFixed(1)}`).join("");

  // Direct labels at the right edge, nudged apart so they never overlap.
  const labelYs = [...series.map((s) => y(s[s.length - 1].value)), y(series[0][years].invested)];
  const order = labelYs.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  for (let k = 1; k < order.length; k++) order[k].v = Math.max(order[k].v, order[k - 1].v + 14);
  const placed = Object.fromEntries(order.map((o) => [o.i, o.v]));

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * (W - PAD.l - PAD.r);
    setHover(Math.max(0, Math.min(years, Math.round((px / (W - PAD.l - PAD.r)) * years))));
  };

  const h = hover;
  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="text-lg font-semibold">Projected value</figcaption>
      <div className="relative overflow-x-auto rounded-lg border border-line bg-surface p-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="num block w-full min-w-[560px] text-ink-muted" role="img" aria-label="Projected portfolio value by year for three return scenarios, with total invested">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth={1} />
              <text x={PAD.l - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="currentColor">
                {formatRsShort(t).replace("Rs ", "")}
              </text>
            </g>
          ))}
          {xTicks.map((t) => (
            <text key={t} x={x(t)} y={H - 8} textAnchor="middle" fontSize={11} fill="currentColor">
              {t === 0 ? "Now" : `Yr ${t}`}
            </text>
          ))}
          <path d={path(series[0], "invested")} fill="none" stroke="var(--ink-muted)" strokeWidth={2} strokeDasharray="5 4" />
          {series.map((s, i) => (
            <path key={i} d={path(s, "value")} fill="none" stroke={SERIES_VARS[i]} strokeWidth={2} strokeLinejoin="round" />
          ))}
          {series.map((s, i) => (
            <text key={i} x={W - PAD.r + 8} y={placed[i]} dy="0.32em" fontSize={11} fill="var(--ink)">
              {names[i].split(" ")[0]} {formatRsShort(s[years].value).replace("Rs ", "")}
            </text>
          ))}
          <text x={W - PAD.r + 8} y={placed[3]} dy="0.32em" fontSize={11} fill="currentColor">
            Invested {formatRsShort(series[0][years].invested).replace("Rs ", "")}
          </text>
          {h !== null && (
            <g>
              <line x1={x(h)} x2={x(h)} y1={PAD.t} y2={H - PAD.b} stroke="var(--ink-muted)" strokeWidth={1} />
              {series.map((s, i) => (
                <circle key={i} cx={x(h)} cy={y(s[h].value)} r={4} fill={SERIES_VARS[i]} stroke="var(--surface)" strokeWidth={2} />
              ))}
            </g>
          )}
          <rect
            x={PAD.l}
            y={PAD.t}
            width={W - PAD.l - PAD.r}
            height={H - PAD.t - PAD.b}
            fill="transparent"
            onPointerMove={onMove}
            onPointerLeave={() => setHover(null)}
          />
        </svg>
        {h !== null && (
          <div
            className="num pointer-events-none absolute top-3 rounded-md border border-line bg-surface px-3 py-2 text-xs shadow-md"
            style={{ left: `calc(${((x(h) / W) * 100).toFixed(1)}% ${h > years / 2 ? "- 190px" : "+ 12px"})` }}
          >
            <div className="mb-1 font-medium text-ink">Year {h}</div>
            {series.map((s, i) => (
              <div key={i} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-ink-muted">
                  <span className="inline-block h-0.5 w-3 rounded" style={{ background: SERIES_VARS[i] }} />
                  {names[i]}
                </span>
                <span className="text-ink">{formatRsShort(s[h].value)}</span>
              </div>
            ))}
            <div className="flex justify-between gap-4 text-ink-muted">
              <span>Invested</span>
              <span>{formatRsShort(series[0][h].invested)}</span>
            </div>
          </div>
        )}
      </div>
    </figure>
  );
}
