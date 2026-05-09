import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { Pill } from "@/components/dashboard/Pill";
import { usd, num, pct } from "@/lib/format";
import type { Snapshot as Snap } from "@/types/api";

const EQUATIONS = [
  {
    id: "cuow", name: "CUoW",
    long: "Cost per Unit of Work",
    formula: "CUoW = Σ amortized_cost / Σ tasks_completed",
    desc: "The microeconomic floor. Below ABT, a task is profitable to automate.",
    tone: "orange",
  },
  {
    id: "abt", name: "ABT",
    long: "Agent Break-even Threshold",
    formula: "ABT = manual_hourly_cost × (baseline_minutes / 60) / amortized_cost",
    desc: "The economic frontier separating human-cheaper from agent-cheaper work.",
    tone: "primary",
  },
  {
    id: "mer", name: "MER",
    long: "Model Efficiency Ratio",
    formula: "MER = labor_value_saved / amortized_cost",
    desc: "Output value per dollar of model spend. The vendor-swap signal.",
    tone: "green",
  },
  {
    id: "ctr", name: "CTR",
    long: "Coordination Tax Ratio",
    formula: "CTR = coordination_cost / total_uop_value",
    desc: "Drag from human handoffs, retries, and policy gates. Falls as trust tier rises.",
    tone: "amber",
  },
  {
    id: "tv", name: "TV",
    long: "Transformation Velocity",
    formula: "TV = ΔTUoP / Δt",
    desc: "Rate at which the hybrid workforce acquires productive capacity.",
    tone: "primary",
  },
];

export default function FiveEquations() {
  const { data: snaps } = useQuery<Snap[]>({ queryKey: ["/api/pel/equations"] });
  const eq = (snaps ?? [])[(snaps ?? []).length - 1];

  return (
    <Layout title="The Five Business Equations" kicker="Insights / Five Equations">
      <p className="text-sm text-muted-foreground max-w-3xl mb-5 leading-relaxed">
        The operating system of the AI economy. Five equations, computed continuously across
        every canonical event in your tenant. Each one answers a different executive question —
        and each one writes its result into the audit chain.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {EQUATIONS.map(e => {
          const value = (eq as any)?.[e.id];
          return (
            <SectionCard key={e.id} kicker={e.long} title={e.name}
              action={<Pill tone="blue">live</Pill>}>
              <div className="text-3xl font-bold tabular-nums mb-2">
                {value == null ? "—"
                  : e.id === "cuow" ? usd(value, { decimals: 4 })
                  : e.id === "ctr" ? pct(value)
                  : e.id === "tv" ? num(value, 1) + "/h"
                  : num(value, 2)}
              </div>
              <code className="block text-[11px] font-mono bg-muted px-3 py-2 rounded mb-2 text-muted-foreground">
                {e.formula}
              </code>
              <p className="text-xs text-muted-foreground">{e.desc}</p>
            </SectionCard>
          );
        })}
        <SectionCard kicker="Master equation" title="UoP — Total Units of Production"
          action={<Pill tone="blue">Family 2</Pill>}
          className="lg:col-span-2">
          <div className="grid md:grid-cols-4 gap-3 items-center">
            <Term label="HUoP" value={eq?.huop} />
            <Term label="AUoP" value={eq?.auop} />
            <Term label="H × A × S" value={eq?.synergyS} />
            <Term label="TUoP" value={eq?.tuop} highlight />
          </div>
          <code className="block text-[11px] font-mono bg-muted px-3 py-2 rounded mt-3 text-muted-foreground">
            TUoP = HUoP + AUoP + (H × A × S)
          </code>
        </SectionCard>
      </div>
    </Layout>
  );
}
function Term({ label, value, highlight }: { label: string; value?: number | null; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border-2 p-3 ${highlight ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
      <div className="text-[10px] uppercase tracking-[.16em] text-muted-foreground font-semibold">{label}</div>
      <div className={`text-2xl font-bold tabular-nums mt-1 ${highlight ? "text-primary" : ""}`}>{value == null ? "—" : num(value, 1)}</div>
    </div>
  );
}
