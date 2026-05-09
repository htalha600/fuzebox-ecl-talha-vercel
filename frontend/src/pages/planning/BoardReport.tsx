import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { Pill, SigmaBadge } from "@/components/dashboard/Pill";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { usd, num, pct } from "@/lib/format";
import type { Summary } from "@/types/api";

export default function BoardReport() {
  const { data: s } = useQuery<Summary>({ queryKey: ["/api/dashboard/summary"] });
  const eq = s?.latestEquations;
  const ec = s?.economics;

  return (
    <Layout title="Board Report" kicker="Planning / Board Report"
      headerRight={
        <Button size="sm" data-testid="btn-export-board">
          <Download className="h-3.5 w-3.5 mr-1.5" /> Export PDF
        </Button>
      }>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-5">
        <SectionCard kicker="Configuration" title="Build the report">
          <dl className="text-sm space-y-3">
            <Row k="Report name" v="Q2 2026 Board Update" />
            <Row k="Date range"  v="Apr 1 – Jun 30, 2026" />
            <Row k="Tenant"      v="ten_demo" />
            <Row k="Sections" v={
              <div className="flex flex-wrap gap-1">
                <Pill tone="blue">Executive summary</Pill>
                <Pill tone="blue">Five Equations</Pill>
                <Pill tone="blue">Trust ladder</Pill>
                <Pill tone="blue">Audit chain</Pill>
              </div>
            } />
            <Row k="Format" v={<Pill tone="slate">PDF</Pill>} />
          </dl>
        </SectionCard>

        <SectionCard kicker="Live preview" title="Q2 2026 — Board Report" padding={false}>
          <div className="px-7 py-7 space-y-6 bg-card">
            <header className="border-b pb-4">
              <div className="text-[10px] uppercase tracking-[.18em] text-muted-foreground">Confidential · For Board Use Only</div>
              <h2 className="text-2xl font-bold mt-1">Economic Cognition · Operating Review</h2>
              <p className="text-sm text-muted-foreground mt-1">Q2 2026 · ten_demo · prepared by FuzeBox AEOS</p>
            </header>

            <section>
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">Executive summary</h3>
              <p className="text-sm leading-relaxed">
                The hybrid workforce delivered a net economic surplus of <strong>{usd(ec?.netSavingsUsd ?? 0)}</strong>
                {" "}across <strong>{s?.counts.events ?? 0}</strong> agent decisions reconciled through the
                Predictive Economic Ledger. Return on Potential converged at <strong>{ec ? num(ec.ropAvg, 2) : "—"}×</strong>
                — an indicator the agent fleet is now meaningfully accretive after governance overhead.
              </p>
            </section>

            <section>
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">Five Equations</h3>
              <table className="w-full text-sm">
                <tbody>
                  <Tr k="CUoW · Cost / Unit of Work"     v={eq ? usd(eq.cuow, { decimals: 4 }) : "—"} />
                  <Tr k="ABT · Agent Break-even Threshold" v={eq ? num(eq.abt, 2) : "—"} />
                  <Tr k="MER · Model Efficiency Ratio"     v={eq ? num(eq.mer, 2) : "—"} />
                  <Tr k="CTR · Coordination Tax Ratio"     v={eq ? pct(eq.ctr) : "—"} />
                  <Tr k="TV  · Transformation Velocity"    v={eq ? num(eq.tv, 1) + "/h" : "—"} />
                </tbody>
              </table>
            </section>

            <section>
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">UoP Master Equation</h3>
              <div className="text-sm">
                <code className="font-mono bg-muted px-2 py-1 rounded">TUoP = HUoP + AUoP + (H × A × S)</code>
                <p className="mt-2">
                  HUoP <strong className="tabular-nums">{eq ? num(eq.huop, 1) : "—"}</strong> ·
                  AUoP <strong className="tabular-nums"> {eq ? num(eq.auop, 1) : "—"}</strong> ·
                  Synergy <strong className="tabular-nums"> {eq ? num(eq.synergyS, 1) : "—"}</strong> ·
                  Total <strong className="tabular-nums text-primary"> {eq ? num(eq.tuop, 1) : "—"}</strong>
                </p>
              </div>
            </section>

            <section>
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">Sigma scores</h3>
              <div className="flex items-center gap-3 flex-wrap">
                <SigmaBadge value={eq ? Math.min(5, eq.mer * 1.2) : 3.4} />
                <Pill tone="blue">{s?.counts.ledgerClosed ?? 0} / {s?.counts.ledgerRows ?? 0} ledger rows reconciled</Pill>
                <Pill tone="green">{s?.counts.coverageEntries ?? 0} surfaces signed</Pill>
                <Pill tone="amber">{s?.counts.newRecommendations ?? 0} pending recommendations</Pill>
              </div>
            </section>

            <footer className="pt-4 border-t text-[10px] text-muted-foreground">
              Confidential — r-Potential by FuzeBox · Patent Family 6 / 8 · USPTO Provisional 63/898,712 · Page 1 of 1
            </footer>
          </div>
        </SectionCard>
      </div>
    </Layout>
  );
}
function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[.16em] text-muted-foreground font-semibold">{k}</dt>
      <dd className="font-medium">{v}</dd>
    </div>
  );
}
function Tr({ k, v }: { k: string; v: React.ReactNode }) {
  return <tr className="border-b last:border-0"><td className="py-2 pr-3 text-muted-foreground">{k}</td><td className="py-2 font-semibold tabular-nums text-right">{v}</td></tr>;
}
