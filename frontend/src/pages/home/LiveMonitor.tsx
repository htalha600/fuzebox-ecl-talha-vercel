import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { Pill, StatusDot, SigmaBadge } from "@/components/dashboard/Pill";
import { Activity, Clock, ShieldCheck, Zap } from "lucide-react";
import { usd, ago, num } from "@/lib/format";
import { Button } from "@/components/ui/button";
import type { Event, Agent } from "@/types/api";

export default function LiveMonitor() {
  const { data: events, dataUpdatedAt } = useQuery<Event[]>({
    queryKey: ["/api/observation/events"],
    refetchInterval: 5000,
  });
  const { data: agents } = useQuery<Agent[]>({ queryKey: ["/api/agents"] });
  const ev = events ?? [];
  const passed = ev.filter(e => e.passedThresholds).length;
  const successRate = ev.length ? passed / ev.length : 0;
  const avgLatency = ev.length ? ev.reduce((s, e) => s + e.wallMs, 0) / ev.length : 0;

  return (
    <Layout title="Live Monitor" kicker="Home / Live Monitor">
      <div className="rounded-xl bg-[hsl(142_72%_96%)] border border-[hsl(142_72%_82%)] px-5 py-4 mb-5 flex items-center gap-3">
        <ShieldCheck className="h-5 w-5 text-[hsl(142_70%_30%)]" />
        <div className="flex-1">
          <div className="font-semibold text-[hsl(142_70%_22%)]">All Systems Operational</div>
          <div className="text-xs text-[hsl(142_70%_30%)]">Last refresh · {ago(new Date(dataUpdatedAt).toISOString())} · auto-refresh every 5s</div>
        </div>
        <Button size="sm" variant="destructive" data-testid="btn-pause-all">
          Emergency Pause All Agents
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard tone="primary" icon={<Activity className="h-4 w-4" />}
          label="EVENTS OBSERVED" value={ev.length + ""} sub="last 200 captured" />
        <KpiCard tone="green" icon={<Zap className="h-4 w-4" />}
          label="SUCCESS RATE" value={(successRate * 100).toFixed(0) + "%"} sub={`${passed} / ${ev.length} threshold pass`} />
        <KpiCard tone="amber" icon={<Clock className="h-4 w-4" />}
          label="AVG LATENCY" value={num(avgLatency, 0) + " ms"} sub="wall-time per call" />
        <KpiCard tone="orange" icon={<Activity className="h-4 w-4" />}
          label="ACTIVE AGENTS" value={(agents ?? []).length + ""} sub="across 5 vendors" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-5">
        <SectionCard kicker="Agents" title="Real-time agent health" padding={false}>
          <ul className="divide-y">
            {(agents ?? []).map(a => {
              const sigma = a.status === "red" ? 2.7 : a.status === "amber" ? 3.2 : 4.1;
              const myEvents = ev.filter(e => e.agentId === a.agentId);
              const myPass = myEvents.filter(e => e.passedThresholds).length;
              const rate = myEvents.length ? Math.round((myPass / myEvents.length) * 100) : 0;
              return (
                <li key={a.agentId} className="px-5 py-3 flex items-center gap-3">
                  <StatusDot tone={a.status as any} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{a.name}</div>
                    <div className="text-xs text-muted-foreground">
                      <span className="font-mono">{a.model}</span> · {myEvents.length} events
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground tabular-nums w-16 text-right">{rate}%</div>
                  <SigmaBadge value={sigma} trend={a.status === "red" ? "down" : undefined} />
                </li>
              );
            })}
          </ul>
        </SectionCard>

        <SectionCard kicker="Live event feed" title="Last 30 calls" padding={false}>
          <ul className="divide-y max-h-[600px] overflow-y-auto">
            {ev.slice(0, 30).map(e => (
              <li key={e.eventId} className="px-5 py-2.5 flex items-center gap-3 text-xs">
                <span className="font-mono text-muted-foreground w-12 shrink-0">{ago(e.capturedAt)}</span>
                {e.passedThresholds
                  ? <Pill tone="green">OK</Pill>
                  : <Pill tone="red">FAIL</Pill>}
                <span className="font-mono text-[11px] truncate flex-1">{e.agentId}</span>
                <span className="tabular-nums text-muted-foreground">{e.wallMs}ms</span>
                <span className="tabular-nums">{usd(e.vendorCostUsd, { decimals: 4 })}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </Layout>
  );
}
