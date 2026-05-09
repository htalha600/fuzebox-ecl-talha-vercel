import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { SectionCard, SectionTitle } from "@/components/dashboard/SectionCard";
import { Pill, SigmaBadge, StatusDot } from "@/components/dashboard/Pill";
import { usd, num, pct } from "@/lib/format";
import {
  Coins, Activity, Award, ShieldCheck, Sparkles, Eye, BookCheck,
  Database, ArrowUpRight, AlertTriangle, ScanSearch,
} from "lucide-react";
import { Link } from "wouter";
import type { Summary, Agent, Rec } from "@/types/api";

const TRUST_TIERS: Record<string, string> = {
  T0_unverified: "T0 · Unverified",
  T1_observed:   "T1 · Observed",
  T2_supervised: "T2 · Supervised",
  T3_trusted:    "T3 · Trusted",
  T4_autonomous: "T4 · Autonomous",
};

export default function Dashboard() {
  const { data: s }      = useQuery<Summary>({ queryKey: ["/api/dashboard/summary"] });
  const { data: agents } = useQuery<Agent[]>({ queryKey: ["/api/agents"] });
  const { data: recs }   = useQuery<Rec[]>({ queryKey: ["/api/recommendations"] });

  const eq = s?.latestEquations;
  const ec = s?.economics;
  const counts = s?.counts;
  const newRecs = (recs ?? []).filter(r => r.status === "new").slice(0, 4);
  const attentionAgents = (agents ?? []).filter(a => a.status !== "green").slice(0, 3);

  return (
    <Layout title="Your AI Workforce — Economic Cognition" kicker="Home / Dashboard">
      {/* HERO */}
      <section
        className="relative rounded-2xl text-white px-7 py-7 mb-6 overflow-hidden ecl-card-shadow"
        style={{
          background:
            "linear-gradient(120deg, hsl(220 50% 18%) 0%, hsl(213 84% 38%) 50%, hsl(189 90% 40%) 100%)",
        }}
        data-testid="hero-card"
      >
        <div className="absolute inset-0 opacity-[.07] pointer-events-none"
          style={{ backgroundImage: "radial-gradient(circle at 25% 0%, white 0, transparent 35%), radial-gradient(circle at 90% 100%, white 0, transparent 40%)" }} />
        <div className="relative grid md:grid-cols-[1.4fr_1fr] gap-8 items-end">
          <div>
            <div className="text-[11px] uppercase tracking-[.2em] opacity-80 mb-2">Live · Economic Cognition Layer</div>
            <h2 className="text-2xl md:text-[28px] font-semibold leading-tight">
              {counts?.agents ?? 0} AI agents observed · saving{" "}
              <span className="text-[hsl(38_100%_70%)] font-bold">{usd(ec?.weeklyRunRateUsd ?? 0)}</span>/week
            </h2>
            <p className="mt-2 text-sm opacity-85 max-w-2xl">
              FuzeBox AEOS is reading every agent decision across {counts?.coverageEntries ?? 0} surfaces,
              reconciling {counts?.ledgerClosed ?? 0} closed-loop ledger rows against your Systems of Record,
              and computing the Five Business Equations in real time.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 self-stretch">
            <HeroStat label="QUALITY"     value={eq ? num(eq.mer, 2) + "×" : "—"} sub="MER (model efficiency)" />
            <HeroStat label="WORKFORCE"   value={eq ? pct(eq.auop / Math.max(eq.tuop || 1, 1)) : "—"} sub="agent share of UoP" />
            <HeroStat label="FINANCE"     value={usd(ec?.netSavingsUsd ?? 0)} sub="net economic surplus" />
            <HeroStat label="COMPLIANCE"  value={counts?.ledgerOpen != null ? `${counts.ledgerClosed}/${counts.ledgerRows}` : "—"} sub="ledger rows reconciled" />
          </div>
        </div>
      </section>

      {/* TOP KPI ROW */}
      <SectionTitle>Economic cognition · key indicators</SectionTitle>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard tone="primary" icon={<Coins className="h-4 w-4" />}
          label="RoP — RETURN ON POTENTIAL"
          value={ec ? num(ec.ropAvg, 2) + "×" : "—"}
          sub={`${counts?.events ?? 0} canonical events observed`} />
        <KpiCard tone="orange" icon={<Activity className="h-4 w-4" />}
          label="CUoW — COST PER UNIT OF WORK"
          value={eq ? usd(eq.cuow, { decimals: 4 }) : "—"}
          sub={eq ? `${eq.taskCount} tasks · 1h window` : "no telemetry yet"} />
        <KpiCard tone="green" icon={<Sparkles className="h-4 w-4" />}
          label="MER — MODEL EFFICIENCY RATIO"
          value={eq ? num(eq.mer, 2) : "—"}
          sub="value produced per $ of model spend" />
        <KpiCard tone="amber" icon={<AlertTriangle className="h-4 w-4" />}
          label="CTR — COORDINATION TAX RATIO"
          value={eq ? pct(eq.ctr) : "—"}
          sub="overhead drag on transformation velocity" />
      </div>

      {/* TWO COLUMN: Equation roll-up + Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-5 mb-6">
        <SectionCard kicker="The Five Business Equations" title="Live cognition rollup"
          action={<Pill tone="blue">Patent Family 8 · PEL</Pill>}>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <EqStat label="CUoW"      v={eq ? usd(eq.cuow, { decimals: 4 }) : "—"} sub="cost / unit of work" />
            <EqStat label="ABT"       v={eq ? num(eq.abt, 2) : "—"} sub="agent break-even threshold" />
            <EqStat label="MER"       v={eq ? num(eq.mer, 2) : "—"} sub="model efficiency ratio" />
            <EqStat label="CTR"       v={eq ? pct(eq.ctr) : "—"} sub="coordination tax ratio" />
            <EqStat label="TV"        v={eq ? num(eq.tv, 1) + "/h" : "—"} sub="transformation velocity" />
            <EqStat label="RoP"       v={eq ? num(eq.rop, 2) + "×" : "—"} sub="return on potential" tone="primary" />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-xs border-t pt-4">
            <UopBlock label="HUoP — Human"    val={eq?.huop} hint="human units of production" />
            <UopBlock label="AUoP — AI"       val={eq?.auop} hint="agent units of production" />
            <UopBlock label="Synergy · H×A×S" val={eq?.synergyS} hint="hybrid amplification" />
          </div>
          <p className="text-[11px] text-muted-foreground mt-4 leading-relaxed">
            <span className="font-semibold">TUoP = HUoP + AUoP + (H × A × S)</span> — the UoP Master Equation
            (Patent Family 2). Synergy term captures cross-agent and human-in-loop amplification
            measurable only at the Economic Cognition Layer.
          </p>
        </SectionCard>

        <SectionCard kicker="Cognition output" title="Active recommendations"
          action={
            <Link href="/recommendations" className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1">
              View all <ArrowUpRight className="h-3 w-3" />
            </Link>
          }
          padding={false}>
          {newRecs.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">
              No new recommendations · system observing
            </div>
          ) : (
            <ul className="divide-y">
              {newRecs.map(r => (
                <li key={r.recId} className="px-5 py-3.5">
                  <div className="flex items-start gap-3">
                    <SeverityBadge severity={r.severity} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-foreground leading-snug">{r.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{r.rationale}</div>
                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                        <span className="font-mono">{r.template}</span>
                        {r.predictedDeltaUsd != null && (
                          <span className="text-[hsl(142_70%_30%)] font-semibold">
                            {r.predictedDeltaUsd > 0 ? "+" : ""}{usd(r.predictedDeltaUsd)} / wk
                          </span>
                        )}
                        {r.confidence != null && <span>conf {pct(r.confidence)}</span>}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      {/* THREE PANEL: Observation + Ledger + Coverage */}
      <SectionTitle>Three planes · observation → ledger → governance</SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <PlaneCard
          icon={<Eye className="h-4 w-4" />}
          title="Observation Plane"
          kicker="OBS-01..15"
          to="/observation"
          stat={`${num(counts?.events ?? 0, 0)} events`}
          sub={`${counts?.coverageEntries ?? 0} surfaces · ${counts?.coverageGaps ?? 0} gaps`}
          tone="primary"
        />
        <PlaneCard
          icon={<BookCheck className="h-4 w-4" />}
          title="Predictive Ledger"
          kicker="PEL-01..14 · Family 8"
          to="/ledger"
          stat={`${counts?.ledgerClosed ?? 0}/${counts?.ledgerRows ?? 0} closed`}
          sub={`${counts?.ledgerOpen ?? 0} open · five-structure rows`}
          tone="orange"
        />
        <PlaneCard
          icon={<ShieldCheck className="h-4 w-4" />}
          title="Governance Plane"
          kicker="DIR / SEC / WRB"
          to="/audit"
          stat={`${counts?.newRecommendations ?? 0} actions`}
          sub="closed-loop · v1 observe-not-intervene"
          tone="green"
        />
      </div>

      {/* AGENT ATTENTION + ROSTER */}
      <SectionCard
        kicker="Agent roster · trust governance"
        title="ATTENTION REQUIRED · agents off-target"
        action={
          <Link href="/agents" className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1">
            All agents <ArrowUpRight className="h-3 w-3" />
          </Link>
        }
        padding={false}
        className="mb-6"
      >
        {attentionAgents.length === 0 ? (
          <div className="px-5 py-8 text-sm text-muted-foreground text-center">
            All agents within sigma target · no attention items
          </div>
        ) : (
          <ul className="divide-y">
            {attentionAgents.map(a => (
              <AttentionRow key={a.agentId} a={a} />
            ))}
          </ul>
        )}
      </SectionCard>

      {/* SUMMARY STATS */}
      <div className="grid md:grid-cols-3 gap-4">
        <KpiCard tone="green" icon={<Award className="h-4 w-4" />}
          label="WEEKLY RUN-RATE" value={usd(ec?.weeklyRunRateUsd ?? 0)}
          sub="net of vendor & amortized governance cost" />
        <KpiCard tone="primary" icon={<Database className="h-4 w-4" />}
          label="LABOR VALUE SAVED" value={usd(ec?.laborValueSavedUsd ?? 0)}
          sub="HBM-baselined hours × loaded labor cost" />
        <KpiCard tone="orange" icon={<ScanSearch className="h-4 w-4" />}
          label="AMORTIZED AGENT COST" value={usd(ec?.amortizedCostUsd ?? 0)}
          sub="vendor + 10–20% governance overhead" />
      </div>
    </Layout>
  );
}

function HeroStat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg backdrop-blur-sm bg-white/10 border border-white/15 px-4 py-3">
      <div className="text-[10px] uppercase tracking-[.2em] opacity-75">{label}</div>
      <div className="text-xl font-semibold mt-1 tabular-nums">{value}</div>
      <div className="text-[11px] opacity-75">{sub}</div>
    </div>
  );
}

function EqStat({ label, v, sub, tone = "neutral" }:
  { label: string; v: string; sub: string; tone?: "neutral" | "primary" }) {
  return (
    <div className="rounded-lg border bg-card px-3.5 py-3">
      <div className="text-[10px] uppercase tracking-[.16em] text-muted-foreground font-semibold">{label}</div>
      <div className={`text-xl font-bold tabular-nums mt-1 ${tone === "primary" ? "text-primary" : "text-foreground"}`}>{v}</div>
      <div className="text-[11px] text-muted-foreground">{sub}</div>
    </div>
  );
}

function UopBlock({ label, val, hint }: { label: string; val?: number | null; hint: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[.16em] text-muted-foreground font-semibold">{label}</div>
      <div className="font-bold tabular-nums">{val == null ? "—" : num(val, 1)}</div>
      <div className="text-[10px] text-muted-foreground">{hint}</div>
    </div>
  );
}

function PlaneCard({ icon, title, kicker, to, stat, sub, tone }:
  { icon: React.ReactNode; title: string; kicker: string; to: string; stat: string; sub: string;
    tone: "primary" | "orange" | "green" }) {
  const accent = tone === "primary" ? "hsl(213 84% 56%)"
               : tone === "orange"  ? "hsl(25 95% 55%)"
               :                       "hsl(142 70% 42%)";
  return (
    <Link href={to} className="block rounded-xl border bg-card p-4 ecl-card-shadow hover:border-foreground/20 transition-colors group" data-testid={`plane-${title}`}>
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-lg grid place-items-center text-white shrink-0" style={{ background: accent }}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-[.18em] text-muted-foreground font-semibold">{kicker}</div>
          <div className="text-sm font-semibold">{title}</div>
        </div>
        <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
      </div>
      <div className="mt-3 flex items-baseline justify-between">
        <div className="text-2xl font-bold tabular-nums">{stat}</div>
      </div>
      <div className="text-xs text-muted-foreground">{sub}</div>
    </Link>
  );
}

function AttentionRow({ a }: { a: Agent }) {
  const sigmaGuess = a.status === "red" ? 2.6 : a.status === "amber" ? 3.1 : 4.1;
  const trend = a.status === "red" ? "down" : undefined;
  return (
    <li className="px-5 py-3.5 flex items-center gap-4">
      <div>
        <Pill tone={a.status === "red" ? "red" : a.status === "amber" ? "amber" : "green"}>
          {a.status.toUpperCase()}
        </Pill>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground truncate">{a.name}</div>
        <div className="text-xs text-muted-foreground">
          <span className="font-mono">{a.agentId}</span> · {a.hyperscaler} · {a.model}
        </div>
      </div>
      <div className="hidden sm:block text-xs">
        <span className="text-muted-foreground mr-2">Trust</span>
        <span className="font-mono">{TRUST_TIERS[a.trustTier] ?? a.trustTier}</span>
      </div>
      <SigmaBadge value={sigmaGuess} trend={trend as any} />
      <Link href={`/agents`} className="text-xs text-primary font-medium whitespace-nowrap hover:underline">View →</Link>
    </li>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const tone = severity === "critical" ? "red" : severity === "warn" ? "amber" : "blue";
  return (
    <div className={`mt-0.5 h-7 w-7 rounded-md grid place-items-center shrink-0 ${
      tone === "red" ? "bg-[hsl(0_85%_94%)] text-[hsl(0_72%_44%)]"
      : tone === "amber" ? "bg-[hsl(38_96%_92%)] text-[hsl(28_90%_38%)]"
      : "bg-[hsl(213_100%_94%)] text-[hsl(213_84%_42%)]"
    }`}>
      <StatusDot tone={tone === "red" ? "red" : tone === "amber" ? "amber" : "blue"} />
    </div>
  );
}
