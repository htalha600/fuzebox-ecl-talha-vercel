import type { CanonicalEvent, LedgerRow } from "../../../../shared/schema.js";
import { makeRecommendation, type Recommendation } from "../recommendations.service.js";

export function boundaryViolationTemplate(
  event: CanonicalEvent,
  ledger: LedgerRow | undefined,
): Recommendation | null {
  if (!ledger) return null;
  if (ledger.attributionBucket !== "policy") return null;

  return makeRecommendation(
    event,
    "boundary_violation",
    "Policy boundary violation attributed",
    `Event ${event.eventId} was attributed to a policy boundary violation. Review policy ${event.policyId} constraints and agent permissions.`,
    "high",
    0,
  );
}
