import type { CanonicalEvent, LedgerRow } from "../../../../shared/schema.js";
import { makeRecommendation, type Recommendation } from "../recommendations.service.js";

export function costOptimTemplate(
  event: CanonicalEvent,
  _ledger: LedgerRow | undefined,
): Recommendation | null {
  if (event.amortizedCostUsd < 0.01) return null;

  const tokenRatio =
    event.outputTokens > 0 ? event.amortizedCostUsd / event.outputTokens : 0;

  if (tokenRatio > 0.00005) {
    const savings = event.amortizedCostUsd * 0.2;
    return makeRecommendation(
      event,
      "cost_optim",
      "High cost-per-token detected",
      `Agent ${event.agentId} costs $${tokenRatio.toFixed(6)}/token on ${event.hyperscaler}/${event.model}. Consider a smaller model or prompt compression.`,
      "medium",
      savings,
    );
  }
  return null;
}
