import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { Pill, StatusDot } from "@/components/dashboard/Pill";
import { ago } from "@/lib/format";
import { Database, Network, AlertTriangle, ShieldCheck } from "lucide-react";
import type { Coverage } from "@/types/api";

const SURFACES_DOC = [
  { hyperscaler: "anthropic",      surfaces: ["messages", "tool", "computer_use"] },
  { hyperscaler: "openai",         surfaces: ["responses", "operator", "tool"] },
  { hyperscaler: "ms_copilot",     surfaces: ["messages", "agent_run"] },
  { hyperscaler: "uniphore_baic",  surfaces: ["agent_run", "mcp"] },
  { hyperscaler: "mistral",        surfaces: ["messages", "tool"] },
];

export default function CoverageManifest() {
  const { data: cov } = useQuery<Coverage[]>({ queryKey: ["/api/observation/coverage"] });
  const list = cov ?? [];
  const covered = list.filter(c => c.status === "covered").length;
  const degraded = list.filter(c => c.status === "degraded").length;
  const gap = list.filter(c => c.status === "gap").length;

  return (
    <Layout title="Coverage Manifest" kicker="Economic Cognition / Coverage">
      <p className="text-sm text-muted-foreground max-w-3xl mb-4 leading-relaxed">
        The coverage manifest is the contract layer between FuzeBox AEOS and every hyperscaler
        surface. Each row is signed at activation; missing signatures or stale telemetry generate
        coverage gap alerts.
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard tone="primary" icon={<Database className="h-4 w-4" />}
          label="REGISTERED SURFACES" value={list.length + ""} sub="across 5 vendors" />
        <KpiCard tone="green" icon={<ShieldCheck className="h-4 w-4" />}
          label="FULLY COVERED" value={covered + ""} sub="signed + active telemetry" />
        <KpiCard tone="amber" icon={<Network className="h-4 w-4" />}
          label="DEGRADED" value={degraded + ""} sub="stale signal · re-key needed" />
        <KpiCard tone="red" icon={<AlertTriangle className="h-4 w-4" />}
          label="GAPS" value={gap + ""} sub="connector not active" />
      </div>

      <SectionCard kicker="Manifest table" title="Per-surface health" padding={false}>
        <table className="w-full text-sm">
          <thead className="text-[10px] uppercase tracking-[.16em] text-muted-foreground border-b">
            <tr><Th>Vendor</Th><Th>Surface</Th><Th>Status</Th><Th>Activated</Th><Th>Last telemetry</Th><Th>Signature</Th></tr>
          </thead>
          <tbody>
            {list.map((c, i) => {
              const tone = c.status === "covered" ? "green" : c.status === "degraded" ? "amber" : "red";
              return (
                <tr key={i} className="border-b last:border-0 hover:bg-muted/40">
                  <Td><Pill tone="slate">{c.hyperscaler}</Pill></Td>
                  <Td className="font-mono text-xs">{c.surface}</Td>
                  <Td>
                    <Pill tone={tone}>
                      <StatusDot tone={tone} />
                      {c.status.toUpperCase()}
                    </Pill>
                  </Td>
                  <Td className="text-xs">{ago(c.activatedAt)}</Td>
                  <Td className="text-xs">{ago(c.lastTelemetryAt)}</Td>
                  <Td className="font-mono text-[10px]">{c.signature?.slice(0, 14) ?? "—"}…</Td>
                </tr>
              );
            })}
            {list.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">No coverage manifest yet</td></tr>
            )}
          </tbody>
        </table>
      </SectionCard>

      <SectionCard kicker="Hyperscaler coverage map" title="Capture mechanism per vendor" className="mt-5">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {SURFACES_DOC.map(d => (
            <div key={d.hyperscaler} className="rounded-lg border bg-card p-3">
              <div className="font-semibold text-sm mb-2">{d.hyperscaler}</div>
              <ul className="space-y-1">
                {d.surfaces.map(s => (
                  <li key={s} className="flex items-center gap-2 text-xs">
                    <StatusDot tone={list.some(c => c.hyperscaler === d.hyperscaler && c.surface === s && c.status === "covered") ? "green" : "amber"} />
                    <span className="font-mono">{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </SectionCard>
    </Layout>
  );
}

function Th({ children }: { children: React.ReactNode }) { return <th className="text-left px-5 py-2 font-semibold">{children}</th>; }
function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-5 py-2 ${className ?? ""}`}>{children}</td>;
}
