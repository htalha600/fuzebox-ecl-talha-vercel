import type { CanonicalEvent, LedgerRow } from "../../../../shared/schema.js";
import { makeRecommendation, type Recommendation } from "../recommendations.service.js";

export function gstiDriftTemplate(
  event: CanonicalEvent,
  ledger: LedgerRow | undefined,
): Recommendation | null {
  const gsti = ledger?.uefGsti ?? 0;
  if (gsti >= 0.7) return null;

  return makeRecommendation(
    event,
    "gsti_drift",
    "Low GSTI score — output quality drifting",
    `UEF GSTI of ${gsti.toFixed(2)} for agent ${event.agentId} indicates declining output quality. Review prompt engineering or retrain the agent.`,
    gsti < 0.4 ? "high" : "medium",
    0,
  );
}
