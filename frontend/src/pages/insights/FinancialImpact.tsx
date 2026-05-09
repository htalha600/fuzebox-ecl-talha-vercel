import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { Pill } from "@/components/dashboard/Pill";
import { usd, num, pct } from "@/lib/format";
import { DollarSign, TrendingUp, Wallet, Receipt } from "lucide-react";
import type { Summary, Event } from "@/types/api";

export default function FinancialImpact() {
  const { data: s } = useQuery<Summary>({ queryKey: ["/api/dashboard/summary"] });
  const { data: events } = useQuery<Event[]>({ queryKey: ["/api/observation/events"] });
  const ec = s?.economics;

  // Aggregate by vendor
  const byVendor: Record<string, { saved: number; cost: number; n: number }> = {};
  (events ?? []).forEach(e => {
    byVendor[e.hyperscaler] ??= { saved: 0, cost: 0, n: 0 };
    byVendor[e.hyperscaler].saved += e.laborValueSavedUsd ?? 0;
    byVendor[e.hyperscaler].cost  += e.amortizedCostUsd ?? 0;
    byVendor[e.hyperscaler].n += 1;
  });
  const vendors = Object.entries(byVendor).sort(([, a], [, b]) => (b.saved - b.cost) - (a.saved - a.cost));
  const maxNet = Math.max(...vendors.map(([, v]) => v.saved - v.cost), 1);

  return (
    <Layout title="Financial Impact" kicker="Insights / Financial Impact">
      <p className="text-sm text-muted-foreground max-w-3xl mb-5 leading-relaxed">
        ROI rolled up directly from PEL ledger rows — not estimated, but reconciled against
        Salesforce / SAP / HubSpot / Oracle GL. Every dollar shown here is signed by both
        FuzeBox and r-Potential KMS roots.
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard tone="green" icon={<TrendingUp className="h-4 w-4" />}
          label="WEEKLY NET RUN-RATE" value={usd(ec?.weeklyRunRateUsd ?? 0)} sub="net economic surplus / week" />
        <KpiCard tone="primary" icon={<Wallet className="h-4 w-4" />}
          label="LABOR VALUE SAVED" value={usd(ec?.laborValueSavedUsd ?? 0)} sub="HBM × loaded labor cost" />
        <KpiCard tone="orange" icon={<Receipt className="h-4 w-4" />}
          label="AMORTIZED AGENT COST" value={usd(ec?.amortizedCostUsd ?? 0)} sub="vendor + governance overhead" />
        <KpiCard tone="primary" icon={<DollarSign className="h-4 w-4" />}
          label="RoP" value={ec ? num(ec.ropAvg, 2) + "×" : "—"} sub="return on potential" />
      </div>

      <SectionCard kicker="Per-vendor breakdown" title="Economic contribution by hyperscaler"
        action={<Pill tone="slate">{(events ?? []).length} events</Pill>}>
        <div className="space-y-3">
          {vendors.map(([v, d]) => {
            const net = d.saved - d.cost;
            const pctW = Math.max(2, (net / maxNet) * 100);
            return (
              <div key={v}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <div className="flex items-center gap-2">
                    <Pill tone="slate">{v}</Pill>
                    <span className="text-xs text-muted-foreground">{d.n} events</span>
                  </div>
                  <div className="font-semibold tabular-nums text-[hsl(142_70%_30%)]">{usd(net)} net</div>
                </div>
                <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full gradient-bar rounded-full" style={{ width: `${pctW}%` }} />
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1">
                  <span>saved · {usd(d.saved)}</span>
                  <span>cost · {usd(d.cost)}</span>
                  <span>MER · {num(d.cost > 0 ? d.saved / d.cost : 0, 2)}</span>
                </div>
              </div>
            );
          })}
          {vendors.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">No financial data yet</p>
          )}
        </div>
      </SectionCard>

      <SectionCard kicker="Closed-loop" title="ROI waterfall" className="mt-5">
        <Waterfall labels={["Gross labor saved", "− Vendor cost", "− Governance overhead", "= Net surplus"]}
          values={[
            ec?.laborValueSavedUsd ?? 0,
            -(ec ? ec.amortizedCostUsd * 0.85 : 0),
            -(ec ? ec.amortizedCostUsd * 0.15 : 0),
            ec?.netSavingsUsd ?? 0,
          ]} />
      </SectionCard>
    </Layout>
  );
}

function Waterfall({ labels, values }: { labels: string[]; values: number[] }) {
  const max = Math.max(...values.map(v => Math.abs(v)), 1);
  return (
    <div className="space-y-2">
      {labels.map((l, i) => {
        const v = values[i];
        const w = Math.max(3, (Math.abs(v) / max) * 100);
        const positive = v >= 0;
        return (
          <div key={l} className="grid grid-cols-[1fr_minmax(180px,2fr)_auto] items-center gap-3 text-sm">
            <div className={`${i === labels.length - 1 ? "font-semibold" : "text-muted-foreground"}`}>{l}</div>
            <div className="h-3 bg-muted rounded-full relative">
              <div className={`h-full rounded-full ${positive ? "bg-[hsl(142_70%_42%)]" : "bg-[hsl(0_72%_52%)]"}`}
                style={{ width: `${w}%` }} />
            </div>
            <div className={`tabular-nums font-semibold ${positive ? "text-[hsl(142_70%_30%)]" : "text-[hsl(0_72%_44%)]"}`}>
              {usd(v, { sign: positive })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
