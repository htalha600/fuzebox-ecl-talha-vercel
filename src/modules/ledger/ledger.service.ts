import { randomUUID } from "node:crypto";
import type { IStorage } from "../../db/index.js";
import type { LedgerRow } from "../../../shared/schema.js";
import { canonicalize } from "../../shared/chain.js";
import { loadKms, dualSign } from "../../shared/cosign.js";
import { HttpError } from "../../shared/errors.js";
import type { AttributionBucket } from "../../config/constants.js";
import type { ReconcileInput } from "./ledger.types.js";

const T3_PLUS = new Set(["T3_delegated", "T4_autonomous"]);
const BUDGET_GATE_SIGMA = 0.3; // trigger budget_gate when sigma > 30%

export async function reconcileEvent(
  storage: IStorage,
  input: ReconcileInput,
): Promise<LedgerRow> {
  const kms = loadKms();

  const event = await storage.getCanonicalEvent(input.eventId, input.tenantId);
  if (!event) {
    throw new HttpError(404, `canonical event ${input.eventId} not found`);
  }

  const existing = await storage.getLedgerRowByEventId(
    input.eventId,
    input.tenantId,
  );
  if (!existing) {
    throw new HttpError(404, `ledger row for event ${input.eventId} not found`);
  }
  if (existing.cosignStatus === "complete") {
    throw new HttpError(
      409,
      `ledger row for event ${input.eventId} is already reconciled`,
    );
  }

  const predicted = existing.predictedCostUsd;
  const predictedOutcome = existing.predictedOutcomeUsd;

  const econCostDelta = Number(
    (input.actualCostUsd - predicted).toFixed(6),
  );
  const econWinRateDelta =
    predictedOutcome === 0
      ? 0
      : Number(
          (
            (input.actualOutcomeUsd - predictedOutcome) /
            predictedOutcome
          ).toFixed(6),
        );
  const techVarianceSigma =
    predicted === 0
      ? 0
      : Number((Math.abs(econCostDelta) / predicted).toFixed(6));
  const techErrorRate = event.passedThresholds ? 0 : 1;

  const { bucket, confidence } = classifyAttribution({
    costDelta: econCostDelta,
    predictedCost: predicted,
    winRateDelta: econWinRateDelta,
    passedThresholds: event.passedThresholds,
    confidenceReported: event.confidence,
  });

  const closedAt = new Date();

  const closingPayload = canonicalize({
    id: existing.id,
    eventId: input.eventId,
    tenantId: input.tenantId,
    predictedCostUsd: predicted,
    predictedOutcomeUsd: predictedOutcome,
    actualCostUsd: input.actualCostUsd,
    actualOutcomeUsd: input.actualOutcomeUsd,
    actualSourceSor: input.actualSourceSor,
    techVarianceSigma,
    techErrorRate,
    econCostDelta,
    econWinRateDelta,
    attributionBucket: bucket,
    attributionConfidence: confidence,
    closedAtMs: closedAt.getTime(),
  });

  const { fuzeboxSig, rpotentialSig, cosignStatus } = dualSign(
    kms,
    existing.predictedSignature,
    closingPayload,
  );

  const updated = await storage.updateLedgerRow(
    existing.id,
    input.tenantId,
    {
      actualCostUsd: input.actualCostUsd,
      actualOutcomeUsd: input.actualOutcomeUsd,
      actualSourceSor: input.actualSourceSor,
      fuzeboxSig,
      rpotentialSig,
      cosignStatus,
      techVarianceSigma,
      techErrorRate,
      econCostDelta,
      econWinRateDelta,
      attributionBucket: bucket,
      attributionConfidence: confidence,
      closedAt,
    },
  );

  if (!updated) {
    throw new HttpError(500, "failed to update ledger row");
  }

  // Governance trigger — boundary_violation: passedThresholds=false on T3+ agent
  if (!event.passedThresholds && T3_PLUS.has(event.trustTier)) {
    await storage.insertGovernanceDecision({
      id: `gdec-${randomUUID()}`,
      tenantId: input.tenantId,
      decisionId: event.decisionId,
      policyId: event.policyId,
      outcome: "blocked",
      agentId: event.agentId,
      trustTier: event.trustTier,
      rationale: `boundary_violation: agent ${event.agentId} at ${event.trustTier} failed policy thresholds`,
      cosignedBy: JSON.stringify({
        fuzeboxKeyId: "fuzebox-kms-dev",
        rpotentialKeyId: "rpotential-kms-dev",
      }),
    });
  }

  // Governance trigger — budget_gate: sigma > 30% AND cost overrun
  if (techVarianceSigma > BUDGET_GATE_SIGMA && econCostDelta > 0) {
    await storage.insertGovernanceDecision({
      id: `gdec-${randomUUID()}`,
      tenantId: input.tenantId,
      decisionId: event.decisionId,
      policyId: event.policyId,
      outcome: "deferred",
      agentId: event.agentId,
      trustTier: event.trustTier,
      rationale: `budget_gate: cost overrun ${econCostDelta.toFixed(6)} USD, sigma ${techVarianceSigma.toFixed(3)} exceeds gate`,
      cosignedBy: JSON.stringify({
        fuzeboxKeyId: "fuzebox-kms-dev",
        rpotentialKeyId: "rpotential-kms-dev",
      }),
    });
  }

  return updated;
}

function classifyAttribution(params: {
  costDelta: number;
  predictedCost: number;
  winRateDelta: number;
  passedThresholds: boolean;
  confidenceReported: number;
}): { bucket: AttributionBucket; confidence: number } {
  const costRatio =
    params.predictedCost === 0
      ? 0
      : params.costDelta / params.predictedCost;

  if (!params.passedThresholds) return { bucket: "policy", confidence: 0.85 };
  if (costRatio > 0.5 && params.winRateDelta > -0.1)
    return { bucket: "environment", confidence: 0.7 };
  if (params.winRateDelta < -0.3) return { bucket: "agent", confidence: 0.75 };
  if (Math.abs(costRatio) <= 0.1 && Math.abs(params.winRateDelta) <= 0.1)
    return { bucket: "agent", confidence: 0.6 };
  if (params.confidenceReported < 0.5)
    return { bucket: "data", confidence: 0.6 };
  return { bucket: "prompt", confidence: 0.5 };
}
