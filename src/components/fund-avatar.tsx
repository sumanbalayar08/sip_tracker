import { cn } from "@/lib/utils";

const TONES = [
  "bg-chart-1/15 text-chart-1",
  "bg-chart-2/15 text-chart-2",
  "bg-chart-3/15 text-chart-3",
  "bg-chart-4/20 text-chart-4",
  "bg-chart-5/15 text-chart-5",
];

/** Small coloured badge with a fund's initials, stable per code. */
export function FundAvatar({ code, className }: { code: string; className?: string }) {
  const tone = TONES[[...code].reduce((s, c) => s + c.charCodeAt(0), 0) % TONES.length];
  return (
    <span
      aria-hidden
      className={cn("flex size-9 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold", tone, className)}
    >
      {code.slice(0, 2)}
    </span>
  );
}
