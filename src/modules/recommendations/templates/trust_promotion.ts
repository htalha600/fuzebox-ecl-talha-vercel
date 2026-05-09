import type { CanonicalEvent, LedgerRow } from "../../../../shared/schema.js";
import { makeRecommendation, type Recommendation } from "../recommendations.service.js";

export function trustPromotionTemplate(
  event: CanonicalEvent,
  ledger: LedgerRow | undefined,
): Recommendation | null {
  if (!ledger || ledger.cosignStatus !== "complete") return null;
  if (event.trustTier === "T4_autonomous") return null;

  const sigma = ledger.techVarianceSigma ?? 1;
  const winDelta = ledger.econWinRateDelta ?? -1;

  if (sigma < 0.1 && winDelta >= 0) {
    const tiers: Record<string, string> = {
      T0_unverified: "T1_observed",
      T1_observed: "T2_supervised",
      T2_supervised: "T3_delegated",
      T3_delegated: "T4_autonomous",
    };
    const nextTier = tiers[event.trustTier];
    if (!nextTier) return null;

    return makeRecommendation(
      event,
      "trust_promotion",
      `Agent eligible for trust tier promotion to ${nextTier}`,
      `Agent ${event.agentId} shows low variance (σ=${sigma.toFixed(3)}) and positive win-rate delta. Consider promoting from ${event.trustTier} to ${nextTier}.`,
      "low",
      0,
    );
  }
  return null;
}
