import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { Pill, StatusDot } from "@/components/dashboard/Pill";
import { Button } from "@/components/ui/button";
import { usd, pct } from "@/lib/format";
import { ScanSearch, Lightbulb, RefreshCw, Check, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import type { Rec } from "@/types/api";
const TEMPLATE_TONE: Record<string, any> = {
  cost_optim: "blue", gsti_drift: "amber", boundary_violation: "red",
  vendor_swap: "blue", skill_preserve: "green", trust_promotion: "green", budget_gate: "amber",
};

export default function Recommendations() {
  const qc = useQueryClient();
  const { data: recs } = useQuery<Rec[]>({ queryKey: ["/api/recommendations"] });
  const [filter, setFilter] = useState<"all" | "new" | "adopted" | "rejected">("all");

  const generate = useMutation({
    mutationFn: () => apiRequest("POST", "/api/recommendations/generate"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/recommendations"] }),
  });
  const decide = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("POST", `/api/recommendations/${id}/decide`, { status, decidedBy: "les@fuzebox.ai" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/recommendations"] }),
  });

  const list = (recs ?? []).filter(r => filter === "all" ? true : r.status === filter);
  const newCount = (recs ?? []).filter(r => r.status === "new").length;
  const adoptedCount = (recs ?? []).filter(r => r.status === "adopted").length;
  // Convention: predictedDeltaUsd is the cost change — negative is savings.
  const projectedSavings = -(recs ?? []).filter(r => r.status === "new")
    .reduce((s, r) => s + (r.predictedDeltaUsd ?? 0), 0);

  return (
    <Layout
      title="Recommendations"
      kicker="Economic Cognition / Recommendations"
      headerRight={
        <Button size="sm" onClick={() => generate.mutate()} disabled={generate.isPending} data-testid="btn-generate">
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${generate.isPending ? "animate-spin" : ""}`} />
          Run cognition
        </Button>
      }
    >
      <p className="text-sm text-muted-foreground max-w-3xl mb-4 leading-relaxed">
        The Cognition Plane proposes — humans dispose. Every recommendation is templated
        (cost_optim, gsti_drift, boundary_violation, vendor_swap, skill_preserve, trust_promotion, budget_gate)
        and carries a predicted economic delta plus model confidence.
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <KpiCard tone="primary" icon={<Lightbulb className="h-4 w-4" />}
          label="NEW" value={newCount + ""} sub="awaiting decision" />
        <KpiCard tone="green" icon={<Check className="h-4 w-4" />}
          label="ADOPTED" value={adoptedCount + ""} sub="closed-loop applied" />
        <KpiCard tone="orange" icon={<ScanSearch className="h-4 w-4" />}
          label="PROJECTED SAVINGS" value={usd(projectedSavings)} sub="if all NEW adopted (per week)" />
        <KpiCard tone="slate" icon={<RefreshCw className="h-4 w-4" />}
          label="TEMPLATES ACTIVE" value="7" sub="cognition templates registered" />
      </div>

      <div className="flex items-center gap-2 mb-3">
        <div className="ml-auto flex items-center gap-1 rounded-md border bg-card p-0.5 text-xs">
          {(["all", "new", "adopted", "rejected"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-sm font-medium ${filter === f ? "bg-foreground text-background" : "text-muted-foreground hover-elevate"}`}
              data-testid={`filter-${f}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <SectionCard padding={false}>
        <ul className="divide-y">
          {list.map(r => (
            <li key={r.recId} className="px-5 py-4">
              <div className="flex items-start gap-3">
                <SeverityIcon severity={r.severity} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-semibold text-foreground">{r.title}</h4>
                    <Pill tone={TEMPLATE_TONE[r.template] ?? "neutral"}>{r.template.replace(/_/g, " ")}</Pill>
                    <Pill tone={r.status === "new" ? "amber" : r.status === "adopted" ? "green" : r.status === "rejected" ? "red" : "slate"}>
                      {r.status}
                    </Pill>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{r.rationale}</p>
                  <div className="flex items-center gap-4 text-[11px] text-muted-foreground mt-2">
                    {r.agentId && <span className="font-mono">agent · {r.agentId}</span>}
                    {r.predictedDeltaUsd != null && (
                      <span className="text-[hsl(142_70%_30%)] font-semibold tabular-nums">
                        {r.predictedDeltaUsd > 0 ? "+" : ""}{usd(r.predictedDeltaUsd)} / wk projected
                      </span>
                    )}
                    {r.confidence != null && <span className="tabular-nums">confidence · {pct(r.confidence)}</span>}
                  </div>
                </div>
                {r.status === "new" && (
                  <div className="flex items-center gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => decide.mutate({ id: r.recId, status: "rejected" })} data-testid={`btn-reject-${r.recId}`}>
                      <X className="h-3.5 w-3.5 mr-1" /> Reject
                    </Button>
                    <Button size="sm" onClick={() => decide.mutate({ id: r.recId, status: "adopted" })} data-testid={`btn-adopt-${r.recId}`}>
                      <Check className="h-3.5 w-3.5 mr-1" /> Adopt
                    </Button>
                  </div>
                )}
              </div>
            </li>
          ))}
          {list.length === 0 && (
            <li className="px-5 py-10 text-center text-muted-foreground text-sm">No recommendations for this filter</li>
          )}
        </ul>
      </SectionCard>
    </Layout>
  );
}

function SeverityIcon({ severity }: { severity: string }) {
  const tone = severity === "critical" ? "red" : severity === "warn" ? "amber" : "blue";
  return (
    <div className={`mt-0.5 h-9 w-9 rounded-lg grid place-items-center shrink-0 ${
      tone === "red" ? "bg-[hsl(0_85%_94%)] text-[hsl(0_72%_44%)]"
      : tone === "amber" ? "bg-[hsl(38_96%_92%)] text-[hsl(28_90%_38%)]"
      : "bg-[hsl(213_100%_94%)] text-[hsl(213_84%_42%)]"
    }`}>
      <Lightbulb className="h-4 w-4" />
    </div>
  );
}
