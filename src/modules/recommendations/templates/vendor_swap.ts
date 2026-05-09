import type { CanonicalEvent, LedgerRow } from "../../../../shared/schema.js";
import { makeRecommendation, type Recommendation } from "../recommendations.service.js";

export function vendorSwapTemplate(
  event: CanonicalEvent,
  ledger: LedgerRow | undefined,
): Recommendation | null {
  if (!ledger || ledger.cosignStatus !== "complete") return null;
  if ((ledger.techVarianceSigma ?? 0) < 0.3) return null;

  const savings = event.vendorCostUsd * 0.15;
  return makeRecommendation(
    event,
    "vendor_swap",
    "Vendor swap may reduce variance",
    `High tech variance (σ=${(ledger.techVarianceSigma ?? 0).toFixed(3)}) on ${event.hyperscaler}. Evaluate alternative providers for more predictable costs.`,
    "high",
    savings,
  );
}
