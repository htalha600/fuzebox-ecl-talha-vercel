import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { SectionCard, SectionTitle } from "@/components/dashboard/SectionCard";
import { Pill } from "@/components/dashboard/Pill";
import { Button } from "@/components/ui/button";
import { usd, num, pct, ago } from "@/lib/format";
import { Coins, RefreshCw, GitBranch, Brain, Workflow, Eye, BookCheck, ShieldCheck, Sparkles } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Snapshot, Summary } from "@/types/api";

export default function CognitionPlane() {
  const qc = useQueryClient();
  const { data: s }     = useQuery<Summary>({ queryKey: ["/api/dashboard/summary"] });
  const { data: snaps } = useQuery<Snapshot[]>({ queryKey: ["/api/pel/equations"] });
  const rollup = useMutation({
    mutationFn: () => apiRequest("POST", "/api/pel/rollup"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/pel/equations"] });
      qc.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
    },
  });

  const eq = s?.latestEquations;
  const latest = (snaps ?? [])[(snaps ?? []).length - 1];

  return (
    <Layout
      title="Cognition Plane"
      kicker="Economic Cognition / Cognition Plane"
      headerRight={
        <Button size="sm" onClick={() => rollup.mutate()} disabled={rollup.isPending} data-testid="btn-rollup">
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${rollup.isPending ? "animate-spin" : ""}`} />
          Recompute equations
        </Button>
      }
    >
      <div className="mb-5">
        <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">
          The Cognition Plane is where observation becomes inference. It rolls up the canonical
          event stream through the Predictive Economic Ledger and produces the Five Business
          Equations plus the UoP Master Equation in real time. Output here drives Governance
          decisions and the Recommendation surface.
        </p>
        <div className="flex flex-wrap gap-2 mt-3">
          <Pill tone="blue">Patent Family 2 · UoP Master Equation</Pill>
          <Pill tone="blue">Patent Family 8 · Predictive Economic Ledger</Pill>
          <Pill tone="slate">USPTO 63/898,712</Pill>
        </div>
      </div>

      <SectionTitle>Five Business Equations · live</SectionTitle>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <KpiCard tone="orange" icon={<Coins className="h-4 w-4" />}
          label="CUoW" value={eq ? usd(eq.cuow, { decimals: 4 }) : "—"} sub="cost / unit of work" />
        <KpiCard tone="primary" icon={<GitBranch className="h-4 w-4" />}
          label="ABT" value={eq ? num(eq.abt, 2) : "—"} sub="agent break-even threshold" />
        <KpiCard tone="green" icon={<Sparkles className="h-4 w-4" />}
          label="MER" value={eq ? num(eq.mer, 2) : "—"} sub="model efficiency ratio" />
        <KpiCard tone="amber" icon={<Workflow className="h-4 w-4" />}
          label="CTR" value={eq ? pct(eq.ctr) : "—"} sub="coordination tax ratio" />
        <KpiCard tone="primary" icon={<Brain className="h-4 w-4" />}
          label="TV" value={eq ? num(eq.tv, 1) + "/h" : "—"} sub="transformation velocity" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-5 mb-6">
        <SectionCard kicker="Master equation" title="TUoP = HUoP + AUoP + (H × A × S)"
          action={<Pill tone="blue">Family 2</Pill>}>
          <div className="grid grid-cols-3 gap-4 text-center">
            <Term label="HUoP" value={eq?.huop} hint="human units" tone="slate" />
            <Operator>+</Operator>
            <Term label="AUoP" value={eq?.auop} hint="AI units" tone="primary" />
          </div>
          <div className="grid grid-cols-3 gap-4 text-center mt-3">
            <Operator>+</Operator>
            <Term label="H × A × S" value={eq?.synergyS} hint="hybrid synergy" tone="orange" />
            <Operator>=</Operator>
          </div>
          <div className="mt-3 rounded-xl border-2 border-primary/40 bg-primary/5 px-5 py-4 text-center">
            <div className="text-[10px] uppercase tracking-[.18em] text-muted-foreground font-semibold">TUoP — Total Units of Production</div>
            <div className="text-3xl font-bold tabular-nums text-primary mt-1">{eq ? num(eq.tuop, 1) : "—"}</div>
          </div>
          <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
            The synergy term <code className="font-mono">H × A × S</code> is what makes hybrid
            workforces non-linear. Most ROI tools measure HUoP and AUoP independently and miss
            the cross-term — that's the value FuzeBox AEOS uniquely captures.
          </p>
        </SectionCard>

        <SectionCard kicker="Return on Potential" title="RoP convergence"
          action={<Pill tone="blue">Family 8</Pill>}>
          <div className="text-5xl font-bold tabular-nums text-foreground flex items-baseline gap-1">
            <span>{eq ? num(eq.rop, 2) : "—"}</span>
            <span className="text-2xl text-muted-foreground">×</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2 max-w-md">
            Total economic value generated divided by total amortized agent cost across the
            tenant. Above 1.0× means the agent fleet is net-accretive after governance overhead.
          </p>
          <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
            <Mini label="Tasks (1h)" value={eq?.taskCount ?? 0} />
            <Mini label="Net surplus" value={usd(s?.economics.netSavingsUsd ?? 0)} />
            <Mini label="Weekly run-rate" value={usd(s?.economics.weeklyRunRateUsd ?? 0)} />
          </div>
        </SectionCard>
      </div>

      <SectionCard kicker="Recent snapshots" title="Equation rollup history (24h)" padding={false}>
        <table className="w-full text-sm">
          <thead className="text-[10px] uppercase tracking-[.16em] text-muted-foreground border-b">
            <tr><Th>Computed</Th><Th>CUoW</Th><Th>ABT</Th><Th>MER</Th><Th>CTR</Th><Th>TV</Th><Th>RoP</Th><Th>TUoP</Th><Th>Tasks</Th></tr>
          </thead>
          <tbody>
            {(snaps ?? []).slice().reverse().slice(0, 12).map(sn => (
              <tr key={sn.id} className="border-b last:border-0 hover:bg-muted/40">
                <Td mono>{ago(sn.computedAt)}</Td>
                <Td>{usd(sn.cuow, { decimals: 4 })}</Td>
                <Td>{num(sn.abt, 2)}</Td>
                <Td>{num(sn.mer, 2)}</Td>
                <Td>{pct(sn.ctr)}</Td>
                <Td>{num(sn.tv, 1)}/h</Td>
                <Td className="text-primary font-semibold">{num(sn.rop, 2)}×</Td>
                <Td>{num(sn.tuop, 1)}</Td>
                <Td>{sn.taskCount}</Td>
              </tr>
            ))}
            {(!snaps || snaps.length === 0) && (
              <tr><td colSpan={9} className="px-5 py-8 text-center text-muted-foreground">No snapshots yet · click "Recompute equations"</td></tr>
            )}
          </tbody>
        </table>
      </SectionCard>

      <SectionTitle className="mt-6">Wired layers</SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <PipelineCard icon={<Eye className="h-4 w-4" />} title="Observation Plane"
          desc="Vendor adapters → Canonical Event v1 → HMAC-chained event log."
          to="/observation" />
        <PipelineCard icon={<BookCheck className="h-4 w-4" />} title="Predictive Ledger"
          desc="Five-structure rows: Predicted / Actual / Variance / Attribution / Correction."
          to="/ledger" />
        <PipelineCard icon={<ShieldCheck className="h-4 w-4" />} title="Governance Plane"
          desc="Policy engine, trust tier promotion/demotion, audit closed-loop."
          to="/audit" />
      </div>
    </Layout>
  );
}

function Term({ label, value, hint, tone }: { label: string; value?: number | null; hint: string; tone: "slate" | "primary" | "orange" }) {
  const c = tone === "primary" ? "bg-[hsl(213_100%_96%)] border-[hsl(213_94%_82%)]"
          : tone === "orange"  ? "bg-[hsl(25_100%_96%)]  border-[hsl(25_95%_80%)]"
          :                      "bg-muted border-border";
  return (
    <div className={`rounded-lg border-2 ${c} px-3 py-3`}>
      <div className="text-[10px] uppercase tracking-[.16em] text-muted-foreground font-semibold">{label}</div>
      <div className="text-2xl font-bold tabular-nums mt-0.5">{value == null ? "—" : num(value, 1)}</div>
      <div className="text-[10px] text-muted-foreground">{hint}</div>
    </div>
  );
}
function Operator({ children }: { children: React.ReactNode }) {
  return <div className="grid place-items-center text-3xl font-bold text-muted-foreground">{children}</div>;
}
function Mini({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-md border bg-card px-3 py-2">
      <div className="text-[10px] uppercase tracking-[.16em] text-muted-foreground font-semibold">{label}</div>
      <div className="font-semibold tabular-nums">{String(value)}</div>
    </div>
  );
}
function Th({ children }: { children: React.ReactNode }) { return <th className="text-left px-5 py-2 font-semibold">{children}</th>; }
function Td({ children, mono, className }: { children: React.ReactNode; mono?: boolean; className?: string }) {
  return <td className={`px-5 py-2 tabular-nums ${mono ? "font-mono text-xs" : ""} ${className ?? ""}`}>{children}</td>;
}
function PipelineCard({ icon, title, desc, to }: { icon: React.ReactNode; title: string; desc: string; to: string }) {
  return (
    <a href={`#${to}`} className="block rounded-xl border bg-card p-4 ecl-card-shadow hover:border-foreground/20 transition-colors">
      <div className="flex items-center gap-2 mb-2">
        <div className="h-8 w-8 rounded-md bg-primary/10 text-primary grid place-items-center">{icon}</div>
        <div className="text-sm font-semibold">{title}</div>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
    </a>
  );
}
