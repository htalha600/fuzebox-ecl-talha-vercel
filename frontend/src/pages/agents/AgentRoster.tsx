import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { Pill, StatusDot, SigmaBadge } from "@/components/dashboard/Pill";
import { Network, ShieldCheck, AlertTriangle, Award } from "lucide-react";
import type { Agent } from "@/types/api";

const TRUST_LADDER = [
  { tier: "T0_unverified", label: "T0 · Unverified", desc: "no telemetry; observe-only" },
  { tier: "T1_observed",   label: "T1 · Observed",   desc: "events captured; no autonomy" },
  { tier: "T2_supervised", label: "T2 · Supervised", desc: "human-gated decisions" },
  { tier: "T3_trusted",    label: "T3 · Trusted",    desc: "autonomous within budget" },
  { tier: "T4_autonomous", label: "T4 · Autonomous", desc: "delegated full envelope" },
];

export default function AgentRoster() {
  const { data: agents } = useQuery<Agent[]>({ queryKey: ["/api/agents"] });
  const list = agents ?? [];
  const green = list.filter(a => a.status === "green").length;
  const amber = list.filter(a => a.status === "amber").length;
  const red = list.filter(a => a.status === "red").length;
  const byTier = (t: string) => list.filter(a => a.trustTier === t).length;

  return (
    <Layout title="Agent Roster" kicker="My AI Agents / Roster">
      <p className="text-sm text-muted-foreground max-w-3xl mb-4 leading-relaxed">
        Trust governance per Patent Family 5. Agents are promoted up the T0–T4 ladder only when
        the Predictive Ledger demonstrates sustained sigma performance and the Coverage Manifest
        confirms full surface observability.
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard tone="primary" icon={<Network className="h-4 w-4" />}
          label="REGISTERED AGENTS" value={list.length + ""} sub={`${green} green · ${amber} amber · ${red} red`} />
        <KpiCard tone="green" icon={<Award className="h-4 w-4" />}
          label="TRUSTED (T3+)" value={(byTier("T3_trusted") + byTier("T4_autonomous")) + ""} sub="cleared for autonomous run" />
        <KpiCard tone="amber" icon={<ShieldCheck className="h-4 w-4" />}
          label="SUPERVISED (T2)" value={byTier("T2_supervised") + ""} sub="human-gated decisions" />
        <KpiCard tone="red" icon={<AlertTriangle className="h-4 w-4" />}
          label="OBSERVED (T0/T1)" value={(byTier("T0_unverified") + byTier("T1_observed")) + ""} sub="not yet promoted" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-5">
        <SectionCard kicker="Roster" title="All registered agents" padding={false}>
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-[.16em] text-muted-foreground border-b">
              <tr><Th>Agent</Th><Th>Vendor / Model</Th><Th>Trust tier</Th><Th>Sigma</Th><Th>Status</Th></tr>
            </thead>
            <tbody>
              {list.map(a => {
                const sigma = a.status === "red" ? 2.7 : a.status === "amber" ? 3.2 : 4.0 + Math.random() * 0.5;
                return (
                  <tr key={a.agentId} className="border-b last:border-0 hover:bg-muted/40">
                    <Td>
                      <div className="font-medium">{a.name}</div>
                      <div className="font-mono text-[11px] text-muted-foreground">{a.agentId}</div>
                    </Td>
                    <Td>
                      <div className="text-xs"><Pill tone="slate">{a.hyperscaler}</Pill></div>
                      <div className="text-xs text-muted-foreground mt-0.5 font-mono">{a.model}</div>
                    </Td>
                    <Td><Pill tone="blue">{a.trustTier.replace(/_/g, " · ")}</Pill></Td>
                    <Td><SigmaBadge value={sigma} /></Td>
                    <Td>
                      <Pill tone={a.status === "green" ? "green" : a.status === "amber" ? "amber" : "red"}>
                        <StatusDot tone={a.status as any} />
                        {a.status.toUpperCase()}
                      </Pill>
                    </Td>
                  </tr>
                );
              })}
              {list.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">No agents registered</td></tr>
              )}
            </tbody>
          </table>
        </SectionCard>

        <SectionCard kicker="Patent Family 5" title="Trust tier ladder">
          <ul className="space-y-3">
            {TRUST_LADDER.map(t => (
              <li key={t.tier}>
                <div className="flex items-center gap-2">
                  <Pill tone="blue">{t.label}</Pill>
                  <span className="text-[11px] text-muted-foreground">{byTier(t.tier)} agent{byTier(t.tier) === 1 ? "" : "s"}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{t.desc}</p>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </Layout>
  );
}
function Th({ children }: { children: React.ReactNode }) { return <th className="text-left px-5 py-2 font-semibold">{children}</th>; }
function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-5 py-2 ${className ?? ""}`}>{children}</td>;
}
