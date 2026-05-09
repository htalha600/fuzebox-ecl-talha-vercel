import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { Pill, StatusDot } from "@/components/dashboard/Pill";
import { usd, num, ago } from "@/lib/format";
import { Eye, Activity, Network, Database, ShieldCheck } from "lucide-react";
import type { Event, Coverage } from "@/types/api";

const VENDOR_TONES: Record<string, "blue" | "amber" | "green" | "slate"> = {
  anthropic: "amber", openai: "green", ms_copilot: "blue",
  uniphore_baic: "amber", mistral: "slate",
};

export default function ObservationPlane() {
  const { data: events }   = useQuery<Event[]>({ queryKey: ["/api/observation/events"] });
  const { data: coverage } = useQuery<Coverage[]>({ queryKey: ["/api/observation/coverage"] });

  const ev = events ?? [];
  const cov = coverage ?? [];
  const totalTokens = ev.reduce((s, e) => s + e.inputTokens + e.outputTokens, 0);
  const totalCost = ev.reduce((s, e) => s + e.amortizedCostUsd, 0);
  const passed = ev.filter(e => e.passedThresholds).length;
  const passRate = ev.length ? passed / ev.length : 0;

  const surfaces = new Set(cov.map(c => `${c.hyperscaler}/${c.surface}`));
  const gaps = cov.filter(c => c.status !== "covered").length;

  return (
    <Layout title="Observation Plane" kicker="Economic Cognition / Observation Plane">
      <div className="mb-5">
        <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">
          Five capture mechanisms — model gateway, hyperscaler proxy, OTel, vendor webhook, eBPF —
          translate every agent decision into the FuzeBox Canonical Event v1, signed and chained.
          This is the boundary observation layer (Patent Family 6) that makes everything above it possible.
        </p>
        <div className="flex flex-wrap gap-2 mt-3">
          <Pill tone="blue">Patent Family 6 · Boundary + Economic Routing</Pill>
          <Pill tone="slate">OBS-01..15</Pill>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard tone="primary" icon={<Eye className="h-4 w-4" />}
          label="OBSERVED EVENTS" value={num(ev.length, 0)} sub="canonical event v1, HMAC-chained" />
        <KpiCard tone="orange" icon={<Network className="h-4 w-4" />}
          label="ACTIVE SURFACES" value={`${surfaces.size}`} sub={`${gaps} gap${gaps === 1 ? "" : "s"} detected`} />
        <KpiCard tone="green" icon={<Activity className="h-4 w-4" />}
          label="THRESHOLD PASS RATE" value={num(passRate * 100, 1) + "%"} sub={`${passed} / ${ev.length} passed`} />
        <KpiCard tone="amber" icon={<Database className="h-4 w-4" />}
          label="AMORTIZED SPEND" value={usd(totalCost)} sub={`${num(totalTokens, 0)} tokens metered`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-5 mb-6">
        <SectionCard kicker="Live event stream" title="Canonical Event v1" padding={false}>
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-[.16em] text-muted-foreground border-b">
              <tr><Th>Time</Th><Th>Vendor</Th><Th>Agent</Th><Th>Model</Th><Th>Tokens</Th><Th>Cost</Th><Th>Saved</Th><Th>Status</Th></tr>
            </thead>
            <tbody>
              {ev.slice(0, 30).map(e => (
                <tr key={e.eventId} className="border-b last:border-0 hover:bg-muted/40">
                  <Td mono>{ago(e.capturedAt)}</Td>
                  <Td><Pill tone={VENDOR_TONES[e.hyperscaler] ?? "neutral"}>{e.hyperscaler}</Pill></Td>
                  <Td mono className="text-xs">{e.agentId}</Td>
                  <Td className="text-xs">{e.model}</Td>
                  <Td>{num(e.inputTokens + e.outputTokens, 0)}</Td>
                  <Td>{usd(e.amortizedCostUsd, { decimals: 4 })}</Td>
                  <Td className="text-[hsl(142_70%_30%)] font-semibold">{usd(e.laborValueSavedUsd, { decimals: 2 })}</Td>
                  <Td>
                    {e.passedThresholds
                      ? <Pill tone="green"><StatusDot tone="green" /> OK</Pill>
                      : <Pill tone="red"><StatusDot tone="red" /> FAIL</Pill>}
                  </Td>
                </tr>
              ))}
              {ev.length === 0 && (
                <tr><td colSpan={8} className="px-5 py-12 text-center text-muted-foreground">No events captured yet</td></tr>
              )}
            </tbody>
          </table>
        </SectionCard>

        <SectionCard kicker="Coverage manifest" title="Capture surface health" padding={false}>
          <ul className="divide-y">
            {cov.map((c, i) => {
              const tone = c.status === "covered" ? "green" : c.status === "degraded" ? "amber" : "red";
              return (
                <li key={i} className="px-5 py-3 flex items-center gap-3">
                  <StatusDot tone={tone} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">
                      <span className="font-mono">{c.hyperscaler}</span>
                      <span className="text-muted-foreground"> / </span>
                      <span>{c.surface}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      last telemetry · {ago(c.lastTelemetryAt)} · sig {c.signature?.slice(0, 8) ?? "—"}
                    </div>
                  </div>
                  <Pill tone={tone === "green" ? "green" : tone === "amber" ? "amber" : "red"}>
                    {c.status.toUpperCase()}
                  </Pill>
                </li>
              );
            })}
            {cov.length === 0 && (
              <li className="px-5 py-8 text-center text-muted-foreground text-sm">No coverage data</li>
            )}
          </ul>
        </SectionCard>
      </div>

      <SectionCard kicker="Audit chain proof" title="HMAC chain integrity">
        <div className="grid md:grid-cols-2 gap-5 text-sm">
          <div>
            <div className="text-[10px] uppercase tracking-[.16em] text-muted-foreground font-semibold mb-2">Most recent event hash</div>
            <code className="block break-all text-[11px] bg-muted px-3 py-2 rounded border font-mono">
              {ev[0]?.auditHash ?? "—"}
            </code>
            <div className="text-[10px] text-muted-foreground mt-1">previousHash · {ev[0]?.prevEventHash?.slice(0, 24) ?? "genesis"}…</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[.16em] text-muted-foreground font-semibold mb-2">Chain properties</div>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Each event signed: <code className="font-mono">HMAC-SHA256(secret, prev_hash || canonical_payload)</code></li>
              <li>• Tamper-evident — any retroactive edit invalidates downstream rows</li>
              <li>• Co-signed by FuzeBox KMS + r-Potential KMS at SoR reconciliation</li>
              <li>• Surface signatures attest live capture of every meter point</li>
            </ul>
          </div>
        </div>
      </SectionCard>
    </Layout>
  );
}

function Th({ children }: { children: React.ReactNode }) { return <th className="text-left px-5 py-2 font-semibold">{children}</th>; }
function Td({ children, mono, className }: { children: React.ReactNode; mono?: boolean; className?: string }) {
  return <td className={`px-5 py-2 tabular-nums ${mono ? "font-mono text-xs" : ""} ${className ?? ""}`}>{children}</td>;
}
