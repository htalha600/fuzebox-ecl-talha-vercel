import type { CanonicalEvent, LedgerRow } from "../../../../shared/schema.js";
import { makeRecommendation, type Recommendation } from "../recommendations.service.js";

export function skillPreserveTemplate(
  event: CanonicalEvent,
  ledger: LedgerRow | undefined,
): Recommendation | null {
  if (!ledger || ledger.cosignStatus !== "complete") return null;
  if ((ledger.econWinRateDelta ?? 0) >= -0.2) return null;

  return makeRecommendation(
    event,
    "skill_preserve",
    "Win-rate decline — consider human-in-loop",
    `Econ win-rate dropped ${((ledger.econWinRateDelta ?? 0) * 100).toFixed(1)}% for agent ${event.agentId}. Introduce human oversight to preserve decision quality.`,
    "medium",
    0,
  );
}
