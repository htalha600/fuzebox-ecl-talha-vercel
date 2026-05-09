import { Layout } from "@/components/layout/Layout";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { Pill } from "@/components/dashboard/Pill";
import { Sparkles } from "lucide-react";
import { Link } from "wouter";

export default function ComingSoon({ title, kicker, blurb }: { title: string; kicker: string; blurb?: string }) {
  return (
    <Layout title={title} kicker={kicker}>
      <SectionCard kicker="In development" title={title}
        action={<Pill tone="blue">v0.6 roadmap</Pill>}>
        <div className="max-w-2xl">
          <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary grid place-items-center mb-3">
            <Sparkles className="h-6 w-6" />
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {blurb ?? `${title} is part of the AEOS v0.6 roadmap and will be wired to the same canonical event stream and Predictive Economic Ledger driving the Economic Cognition Layer pages.`}
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed mt-2">
            In the meantime, explore the live cognition surface:
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <Link href="/cognition" className="text-xs font-semibold text-primary hover:underline">→ Cognition Plane</Link>
            <Link href="/observation" className="text-xs font-semibold text-primary hover:underline">→ Observation Plane</Link>
            <Link href="/ledger" className="text-xs font-semibold text-primary hover:underline">→ Predictive Ledger</Link>
            <Link href="/recommendations" className="text-xs font-semibold text-primary hover:underline">→ Recommendations</Link>
          </div>
        </div>
      </SectionCard>
    </Layout>
  );
}
