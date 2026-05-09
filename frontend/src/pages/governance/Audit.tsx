import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { Pill, StatusDot } from "@/components/dashboard/Pill";
import { ShieldCheck, AlertTriangle, FileSearch, Clock } from "lucide-react";
import { ago } from "@/lib/format";
import { Button } from "@/components/ui/button";
import type { Decision } from "@/types/api";
const OUTCOME_TONE: Record<string, any> = {
  allowed: "green", blocked: "red", human_gate: "amber", reroute: "blue", logged_only: "slate",
};

export default function Audit() {
  const { data: decisions } = useQuery<Decision[]>({ queryKey: ["/api/governance/decisions"] });
  const list = decisions ?? [];
  const blocked = list.filter(d => d.policyOutcome === "blocked").length;
  const gates = list.filter(d => d.policyOutcome === "human_gate").length;
  const reroutes = list.filter(d => d.policyOutcome === "reroute").length;
  const overrideRate = list.length ? (blocked + gates) / list.length : 0;

  return (
    <Layout
      title="Human Oversight Audit Log"
      kicker="Governance / Audit"
      headerRight={
        <Button size="sm" variant="default" data-testid="btn-export">
          <FileSearch className="h-3.5 w-3.5 mr-1.5" />
          Export for audit (PDF)
        </Button>
      }
    >
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 mb-5 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="text-sm">
          <strong className="text-amber-900">ISO/IEC 42001 · EU AI Act Article 14.</strong>{" "}
          <span className="text-amber-800">Every governance decision is HMAC-chained and co-signed by FuzeBox + r-Potential KMS roots — this log is the audit-grade record of human oversight.</span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard tone="primary" icon={<ShieldCheck className="h-4 w-4" />}
          label="TOTAL DECISIONS" value={list.length + ""} sub="last 100 governance events" />
        <KpiCard tone="amber" icon={<Clock className="h-4 w-4" />}
          label="OVERRIDE RATE" value={(overrideRate * 100).toFixed(0) + "%"} sub={`${blocked} blocked · ${gates} gated`} />
        <KpiCard tone="orange" icon={<FileSearch className="h-4 w-4" />}
          label="REROUTES" value={reroutes + ""} sub="cost / quality model swaps" />
        <KpiCard tone="green" icon={<ShieldCheck className="h-4 w-4" />}
          label="COMPLIANCE" value="90%" sub="EU AI Act readiness" />
      </div>

      <SectionCard kicker="Decision log" title="Governance plane events" padding={false}>
        <table className="w-full text-sm">
          <thead className="text-[10px] uppercase tracking-[.16em] text-muted-foreground border-b">
            <tr><Th>Time</Th><Th>Decision</Th><Th>Policy</Th><Th>Outcome</Th><Th>Rationale / Detail</Th></tr>
          </thead>
          <tbody>
            {list.slice(0, 30).map(d => (
              <tr key={d.decisionId} className="border-b last:border-0 hover:bg-muted/40">
                <Td className="text-xs">{ago(d.firedAt)}</Td>
                <Td className="font-mono text-xs">{d.decisionId.slice(0, 18)}…</Td>
                <Td><Pill tone="slate">{d.policyId}</Pill></Td>
                <Td>
                  <Pill tone={OUTCOME_TONE[d.policyOutcome] ?? "neutral"}>
                    <StatusDot tone={
                      d.policyOutcome === "allowed" ? "green"
                      : d.policyOutcome === "blocked" ? "red"
                      : d.policyOutcome === "human_gate" || d.policyOutcome === "reroute" ? "amber"
                      : "slate"} />
                    {d.policyOutcome}
                  </Pill>
                </Td>
                <Td className="text-xs text-muted-foreground max-w-md">
                  {d.rationale ?? "—"}
                  {d.rerouteFromModel && <div className="font-mono text-[11px] mt-0.5">{d.rerouteFromModel} → {d.rerouteToModel}</div>}
                  {d.newTrustTier && <div className="font-mono text-[11px] mt-0.5">{d.prevTrustTier} → {d.newTrustTier}</div>}
                </Td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">No governance decisions yet</td></tr>
            )}
          </tbody>
        </table>
      </SectionCard>
    </Layout>
  );
}
function Th({ children }: { children: React.ReactNode }) { return <th className="text-left px-5 py-2 font-semibold">{children}</th>; }
function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-5 py-2 ${className ?? ""}`}>{children}</td>;
}
