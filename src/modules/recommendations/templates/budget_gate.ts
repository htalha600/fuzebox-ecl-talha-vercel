import type { CanonicalEvent, LedgerRow } from "../../../../shared/schema.js";
import { makeRecommendation, type Recommendation } from "../recommendations.service.js";

export function budgetGateTemplate(
  event: CanonicalEvent,
  _ledger: LedgerRow | undefined,
): Recommendation | null {
  if (event.passedThresholds) return null;

  return makeRecommendation(
    event,
    "budget_gate",
    "Budget threshold breach detected",
    `Agent ${event.agentId} failed policy ${event.policyId} thresholds. Add a pre-decision budget gate to block executions above cost ceiling.`,
    "high",
    event.amortizedCostUsd * 0.5,
  );
}
