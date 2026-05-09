import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { SectionCard, SectionTitle } from "@/components/dashboard/SectionCard";
import { Pill, StatusDot } from "@/components/dashboard/Pill";
import { Button } from "@/components/ui/button";
import { usd, num, ago } from "@/lib/format";
import { BookCheck, GitMerge, Repeat, Target } from "lucide-react";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import type { Row } from "@/types/api";

const ATTR_TONE: Record<string, any> = { agent: "blue", prompt: "amber", data: "slate", policy: "red", environment: "neutral" };

export default function PredictiveLedger() {
  const qc = useQueryClient();
  const { data: rows } = useQuery<Row[]>({ queryKey: ["/api/pel/rows"] });
  const [filter, setFilter] = useState<"all" | "open" | "closed">("all");
  const [active, setActive] = useState<Row | null>(null);
  const reconcile = useMutation({
    mutationFn: (decisionId: string) =>
      apiRequest("POST", "/api/pel/reconcile", {
        decisionId,
        actualCostUsd: 0.012 + Math.random() * 0.04,
        actualOutcomeUsd: 0.6 + Math.random() * 0.6,
        sor: ["salesforce", "sap", "hubspot", "oracle_gl"][Math.floor(Math.random() * 4)],
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/pel/rows"] });
      qc.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
    },
  });

  const list = (rows ?? []).filter(r => filter === "all" ? true : r.status === filter);
  const open = (rows ?? []).filter(r => r.status === "open").length;
  const closed = (rows ?? []).filter(r => r.status === "closed").length;
  const cosigned = (rows ?? []).filter(r => r.cosignStatus === "complete").length;

  return (
    <Layout title="Predictive Economic Ledger" kicker="Economic Cognition / PEL">
      <div className="mb-5">
        <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">
          Five-structure rows replace the single-event log of legacy observability:
          <span className="font-semibold text-foreground"> Predicted</span> →
          <span className="font-semibold text-foreground"> Actual</span> →
          <span className="font-semibold text-foreground"> Variance</span> →
          <span className="font-semibold text-foreground"> Attribution</span> →
          <span className="font-semibold text-foreground"> Correction</span>.
          Each row co-signed by both KMS roots; any tampering breaks the chain.
        </p>
        <div className="flex flex-wrap gap-2 mt-3">
          <Pill tone="blue">Patent Family 8 · Economic Ledger</Pill>
          <Pill tone="slate">PEL-01..14</Pill>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard tone="primary" icon={<BookCheck className="h-4 w-4" />}
          label="LEDGER ROWS" value={num(rows?.length ?? 0, 0)} sub="HMAC-chained" />
        <KpiCard tone="amber" icon={<Target className="h-4 w-4" />}
          label="OPEN ROWS" value={num(open, 0)} sub="awaiting SoR reconciliation" />
        <KpiCard tone="green" icon={<GitMerge className="h-4 w-4" />}
          label="CO-SIGNED CLOSED" value={num(cosigned, 0)} sub={`${closed} closed total`} />
        <KpiCard tone="orange" icon={<Repeat className="h-4 w-4" />}
          label="CORRECTION RATE" value={(rows ?? []).filter(r => r.correctionType).length + ""} sub="DIR patches written back" />
      </div>

      <div className="flex items-center gap-2 mb-3">
        <SectionTitle className="mb-0">Rows</SectionTitle>
        <div className="ml-auto flex items-center gap-1 rounded-md border bg-card p-0.5 text-xs">
          {(["all", "open", "closed"] as const).map(f => (
            <button key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-sm font-medium ${filter === f ? "bg-foreground text-background" : "text-muted-foreground hover-elevate"}`}
              data-testid={`filter-${f}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-5">
        <SectionCard padding={false}>
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-[.16em] text-muted-foreground border-b">
              <tr>
                <Th>Decision</Th><Th>Agent</Th><Th>Status</Th>
                <Th>Pred Cost</Th><Th>Actual</Th>
                <Th>σ Var</Th><Th>Attribution</Th>
              </tr>
            </thead>
            <tbody>
              {list.slice(0, 40).map(r => (
                <tr key={r.decisionId}
                  className={`border-b last:border-0 cursor-pointer hover:bg-muted/40 ${active?.decisionId === r.decisionId ? "bg-primary/5" : ""}`}
                  onClick={() => setActive(r)}
                  data-testid={`row-${r.decisionId}`}>
                  <Td mono className="text-xs">{r.decisionId.slice(0, 16)}…</Td>
                  <Td mono className="text-xs">{r.agentId}</Td>
                  <Td>
                    <Pill tone={r.status === "closed" ? "green" : r.status === "open" ? "amber" : "red"}>
                      {r.status}
                    </Pill>
                  </Td>
                  <Td>{usd(r.predictedCostUsd, { decimals: 4 })}</Td>
                  <Td>{r.actualCostUsd != null ? usd(r.actualCostUsd, { decimals: 4 }) : "—"}</Td>
                  <Td className={r.techVarianceSigma != null && Math.abs(r.techVarianceSigma) > 2 ? "text-[hsl(0_72%_44%)] font-semibold" : ""}>
                    {r.techVarianceSigma != null ? num(r.techVarianceSigma, 2) + "σ" : "—"}
                  </Td>
                  <Td>
                    {r.attributionBucket
                      ? <Pill tone={ATTR_TONE[r.attributionBucket] ?? "neutral"}>{r.attributionBucket}</Pill>
                      : <span className="text-muted-foreground">—</span>}
                  </Td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">No ledger rows for filter</td></tr>
              )}
            </tbody>
          </table>
        </SectionCard>

        <SectionCard kicker={active ? "Five-structure detail" : "Detail"}
          title={active ? `Row · ${active.decisionId.slice(0, 14)}…` : "Select a row"}>
          {!active ? (
            <p className="text-sm text-muted-foreground">Click any row to inspect the predicted / actual / variance / attribution / correction structure and co-signing state.</p>
          ) : (
            <div className="space-y-4">
              <Block title="1 · Predicted" tone="blue">
                <KV k="Cost"     v={usd(active.predictedCostUsd, { decimals: 4 })} />
                <KV k="Outcome"  v={usd(active.predictedOutcomeUsd, { decimals: 2 })} />
                <KV k="GSTI"     v={active.uefGstiClassification ?? "—"} />
                <KV k="Signed"   v={ago(active.createdAt)} />
              </Block>
              <Block title="2 · Actual" tone={active.status === "closed" ? "green" : "slate"}>
                {active.actualCostUsd == null ? (
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground">Awaiting SoR webhook…</div>
                    <Button size="sm" variant="outline" onClick={() => reconcile.mutate(active.decisionId)} disabled={reconcile.isPending} data-testid="btn-reconcile">
                      Simulate SoR reconciliation
                    </Button>
                  </div>
                ) : (
                  <>
                    <KV k="Cost"      v={usd(active.actualCostUsd, { decimals: 4 })} />
                    <KV k="Outcome"   v={usd(active.actualOutcomeUsd ?? 0, { decimals: 2 })} />
                    <KV k="Co-sign"   v={
                      <Pill tone={active.cosignStatus === "complete" ? "green" : "amber"}>
                        <StatusDot tone={active.cosignStatus === "complete" ? "green" : "amber"} />
                        {active.cosignStatus}
                      </Pill>
                    } />
                  </>
                )}
              </Block>
              <Block title="3 · Variance" tone="amber">
                <KV k="σ tech"     v={active.techVarianceSigma != null ? num(active.techVarianceSigma, 2) + "σ" : "—"} />
                <KV k="Cost Δ"     v={active.econCostDelta != null ? usd(active.econCostDelta, { decimals: 4 }) : "—"} />
                <KV k="Win-rate Δ" v={active.econWinRateDelta != null ? num(active.econWinRateDelta * 100, 1) + "%" : "—"} />
              </Block>
              <Block title="4 · Attribution" tone="orange">
                <KV k="Bucket" v={active.attributionBucket ?? "—"} />
                <KV k="Confidence" v={active.attributionConfidence != null ? num(active.attributionConfidence * 100, 0) + "%" : "—"} />
              </Block>
              <Block title="5 · Correction" tone="red">
                <KV k="Type" v={active.correctionType ?? "none"} />
                <KV k="Ref"  v={active.correctionRef ?? "—"} mono />
              </Block>
              <div className="border-t pt-3">
                <div className="text-[10px] uppercase tracking-[.16em] text-muted-foreground font-semibold mb-1">HMAC chain</div>
                <code className="block break-all text-[10px] bg-muted px-2 py-1.5 rounded font-mono">{active.rowHash}</code>
                <div className="text-[10px] text-muted-foreground mt-1">prev · {active.prevRowHash?.slice(0, 24) ?? "genesis"}…</div>
              </div>
            </div>
          )}
        </SectionCard>
      </div>
    </Layout>
  );
}

function Th({ children }: { children: React.ReactNode }) { return <th className="text-left px-5 py-2 font-semibold">{children}</th>; }
function Td({ children, mono, className }: { children: React.ReactNode; mono?: boolean; className?: string }) {
  return <td className={`px-5 py-2 tabular-nums ${mono ? "font-mono" : ""} ${className ?? ""}`}>{children}</td>;
}
function Block({ title, tone, children }: { title: string; tone: "blue" | "amber" | "orange" | "red" | "green" | "slate"; children: React.ReactNode }) {
  const tones: Record<string, string> = {
    blue: "border-[hsl(213_94%_82%)] bg-[hsl(213_100%_97%)]",
    amber: "border-[hsl(38_96%_82%)] bg-[hsl(38_100%_97%)]",
    orange: "border-[hsl(25_95%_80%)] bg-[hsl(25_100%_97%)]",
    red: "border-[hsl(0_85%_84%)]   bg-[hsl(0_100%_97%)]",
    green: "border-[hsl(142_72%_82%)] bg-[hsl(142_72%_97%)]",
    slate: "border-border bg-muted",
  };
  return (
    <div className={`rounded-lg border-l-4 px-3 py-2 ${tones[tone]}`}>
      <div className="text-[10px] uppercase tracking-[.16em] font-semibold text-foreground/70 mb-1">{title}</div>
      <dl className="text-xs space-y-0.5">{children}</dl>
    </div>
  );
}
function KV({ k, v, mono }: { k: string; v: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <dt className="text-muted-foreground w-24 shrink-0">{k}</dt>
      <dd className={`font-medium tabular-nums ${mono ? "font-mono text-[10px] truncate" : ""}`}>{v}</dd>
    </div>
  );
}
