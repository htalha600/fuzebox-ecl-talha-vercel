import { randomUUID } from "node:crypto";
import type { IStorage } from "../../db/index.js";
import { HttpError } from "../../shared/errors.js";
import { MAX_LIMIT } from "../../config/constants.js";
import { TIER_ORDER, type PromoteInput, type TrustTransition } from "./governance.types.js";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const MIN_PASS_RATE = 0.95;

export async function promoteAgent(
  storage: IStorage,
  input: PromoteInput,
): Promise<TrustTransition> {
  const agent = await storage.getAgent(input.agentId, input.tenantId);
  if (!agent) throw new HttpError(404, `agent ${input.agentId} not found`);

  const currentIdx = TIER_ORDER.indexOf(agent.trustTier as (typeof TIER_ORDER)[number]);
  const targetIdx = TIER_ORDER.indexOf(input.targetTier as (typeof TIER_ORDER)[number]);

  if (targetIdx <= currentIdx)
    throw new HttpError(400, `cannot promote from ${agent.trustTier} to ${input.targetTier} — target must be higher`);

  if (targetIdx - currentIdx > 1)
    throw new HttpError(400, `trust tier must advance one step at a time (${agent.trustTier} → next)`);

  // Rule 1 — 30-day minimum tenure at current tier
  const tierSince = agent.tierChangedAt ?? agent.createdAt;
  const tenureMs = Date.now() - (tierSince instanceof Date ? tierSince.getTime() : Number(tierSince));
  if (tenureMs < THIRTY_DAYS_MS) {
    const daysLeft = Math.ceil((THIRTY_DAYS_MS - tenureMs) / 86_400_000);
    throw new HttpError(400, `agent must remain at ${agent.trustTier} for at least 30 days (${daysLeft} day(s) remaining)`);
  }

  // Rule 2 — ≥95% threshold pass rate
  const { rows: agentEvents } = await storage.listCanonicalEvents({
    tenantId: input.tenantId,
    agentId: input.agentId,
    limit: MAX_LIMIT,
  });
  if (agentEvents.length === 0)
    throw new HttpError(400, "agent has no canonical events — cannot evaluate pass rate");

  const passedCount = agentEvents.filter((e) => e.passedThresholds).length;
  const passRate = passedCount / agentEvents.length;
  if (passRate < MIN_PASS_RATE)
    throw new HttpError(
      400,
      `pass rate ${(passRate * 100).toFixed(1)}% is below required 95% (${passedCount}/${agentEvents.length} events passed)`,
    );

  // Rule 3 — no open boundary_violation decisions
  const { total: openViolations } = await storage.listGovernanceDecisions({
    tenantId: input.tenantId,
    agentId: input.agentId,
    outcome: "blocked",
    limit: 1,
  });
  if (openViolations > 0)
    throw new HttpError(400, `agent has ${openViolations} open boundary_violation decision(s) — resolve before promotion`);

  // All checks passed — update agent tier in DB
  const now = new Date();
  await storage.updateAgent(input.agentId, input.tenantId, {
    trustTier: input.targetTier,
    tierChangedAt: now,
  });

  // Write governance_decisions row for the tier change
  await storage.insertGovernanceDecision({
    id: `gdec-${randomUUID()}`,
    tenantId: input.tenantId,
    policyId: "POL_DEFAULT_V1",
    outcome: "allowed",
    agentId: input.agentId,
    trustTier: input.targetTier,
    rationale: input.reason,
    cosignedBy: JSON.stringify({
      fuzeboxKeyId: "fuzebox-kms-dev",
      rpotentialKeyId: "rpotential-kms-dev",
    }),
  });

  return {
    agentId: agent.agentId,
    tenantId: agent.tenantId,
    fromTier: agent.trustTier,
    toTier: input.targetTier,
    reason: input.reason,
    transitionedAt: now.getTime(),
  };
}

export async function demoteAgent(
  storage: IStorage,
  agentId: string,
  tenantId: string,
  reason: string,
): Promise<TrustTransition | null> {
  const agent = await storage.getAgent(agentId, tenantId);
  if (!agent) return null;

  const currentIdx = TIER_ORDER.indexOf(agent.trustTier as (typeof TIER_ORDER)[number]);
  if (currentIdx <= 0) return null; // already at lowest tier

  const newTier = TIER_ORDER[currentIdx - 1];
  const now = new Date();

  await storage.updateAgent(agentId, tenantId, {
    trustTier: newTier,
    tierChangedAt: now,
  });

  await storage.insertGovernanceDecision({
    id: `gdec-${randomUUID()}`,
    tenantId,
    policyId: "POL_DEFAULT_V1",
    outcome: "blocked",
    agentId,
    trustTier: newTier,
    rationale: reason,
    cosignedBy: JSON.stringify({
      fuzeboxKeyId: "fuzebox-kms-dev",
      rpotentialKeyId: "rpotential-kms-dev",
    }),
  });

  return {
    agentId,
    tenantId,
    fromTier: agent.trustTier,
    toTier: newTier,
    reason,
    transitionedAt: now.getTime(),
  };
}

export function evaluateTrustEligibility(
  eventCount: number,
  techVarianceSigma: number,
  currentTier: string,
): { eligible: boolean; reason: string } {
  const thresholds: Record<string, { minEvents: number; maxSigma: number }> = {
    T0_unverified: { minEvents: 10, maxSigma: 0.5 },
    T1_observed: { minEvents: 50, maxSigma: 0.3 },
    T2_supervised: { minEvents: 200, maxSigma: 0.2 },
    T3_delegated: { minEvents: 1000, maxSigma: 0.1 },
  };

  const threshold = thresholds[currentTier];
  if (!threshold) return { eligible: false, reason: "already at maximum tier" };

  if (eventCount < threshold.minEvents)
    return { eligible: false, reason: `requires ${threshold.minEvents} events, has ${eventCount}` };

  if (techVarianceSigma > threshold.maxSigma)
    return {
      eligible: false,
      reason: `variance ${techVarianceSigma.toFixed(3)} exceeds threshold ${threshold.maxSigma}`,
    };

  return { eligible: true, reason: "meets event count and variance criteria (full promotion requires 30-day tenure, 95% pass rate, no violations)" };
}
