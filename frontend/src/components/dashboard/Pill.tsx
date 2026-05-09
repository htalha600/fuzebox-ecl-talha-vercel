import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type PillTone =
  | "green" | "amber" | "red" | "blue" | "neutral" | "slate" | "outline";

const TONES: Record<PillTone, string> = {
  green:   "bg-[hsl(142_72%_92%)] text-[hsl(142_70%_28%)]",
  amber:   "bg-[hsl(38_96%_92%)]  text-[hsl(28_90%_36%)]",
  red:     "bg-[hsl(0_85%_94%)]   text-[hsl(0_72%_42%)]",
  blue:    "bg-[hsl(213_100%_94%)] text-[hsl(213_84%_38%)]",
  neutral: "bg-muted text-muted-foreground",
  slate:   "bg-[hsl(220_14%_94%)] text-[hsl(220_15%_28%)]",
  outline: "border border-border text-foreground bg-transparent",
};

export function Pill({ tone = "neutral", className, children }:
  { tone?: PillTone; className?: string; children: ReactNode }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold tracking-wide",
      TONES[tone], className,
    )}>{children}</span>
  );
}

export function StatusDot({ tone = "green" }: { tone?: "green" | "amber" | "red" | "blue" | "slate" }) {
  const c = tone === "green" ? "hsl(142 70% 42%)"
          : tone === "amber" ? "hsl(38 90% 50%)"
          : tone === "red"   ? "hsl(0 72% 52%)"
          : tone === "blue"  ? "hsl(213 84% 56%)"
          : "hsl(220 10% 60%)";
  return <span aria-hidden className="inline-block h-2 w-2 rounded-full" style={{ background: c }} />;
}

export function SigmaBadge({ value, trend }: { value: number; trend?: "up" | "down" }) {
  const tone: "green" | "blue" | "amber" | "red" =
    value >= 4.0 ? "green" : value >= 3.0 ? "blue" : value >= 2.0 ? "amber" : "red";
  return (
    <Pill tone={tone === "blue" ? "blue" : tone}>
      <StatusDot tone={tone} />
      <span className="tabular-nums">{value.toFixed(1)}Σ</span>
      {trend === "down" && <span aria-hidden>↓</span>}
      {trend === "up" && <span aria-hidden>↑</span>}
    </Pill>
  );
}
