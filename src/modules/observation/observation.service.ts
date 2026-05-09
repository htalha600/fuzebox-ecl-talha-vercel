import { randomUUID } from "node:crypto";
import type { IStorage } from "../../db/index.js";
import type { CanonicalEventInsert } from "../../../shared/schema.js";
import { computeHash, canonicalize, getPrevHash } from "../../shared/chain.js";
import { loadKms } from "../../shared/cosign.js";
import { DEFAULT_AMORTIZATION_RATE } from "../../config/constants.js";
import type { IngestInput, IngestResult } from "./observation.types.js";

export async function ingestEvent(
  storage: IStorage,
  input: IngestInput,
): Promise<IngestResult> {
  const kms = loadKms();
  const eventId = `evt-${randomUUID()}`;
  const decisionId = `dec-${eventId}`;

  const amortizedCostUsd =
    input.amortizedCostUsd ??
    Number((input.vendorCostUsd * DEFAULT_AMORTIZATION_RATE).toFixed(6));

  const laborValueSavedUsd = Number(
    ((input.humanBaselineMinutes / 60) * input.manualHourlyCostUsd).toFixed(6),
  );

  const prev = await storage.getLastCanonicalEventForTenant(input.tenantId);
  const prevEventHash = getPrevHash(prev);

  const canonicalPayload = canonicalize({
    eventId,
    tenantId: input.tenantId,
    decisionId,
    hyperscaler: input.hyperscaler,
    agentId: input.agentId,
    model: input.model,
    inputTokens: input.inputTokens,
    outputTokens: input.outputTokens,
    wallMs: input.wallMs,
    vendorCostUsd: input.vendorCostUsd,
    amortizedCostUsd,
    confidence: input.confidence,
    humanBaselineMinutes: input.humanBaselineMinutes,
    manualHourlyCostUsd: input.manualHourlyCostUsd,
    laborValueSavedUsd,
    passedThresholds: input.passedThresholds,
    policyId: input.policyId,
    trustTier: input.trustTier,
    capturedVia: input.capturedVia,
  });

  const auditHash = computeHash(
    kms.fuzeboxSecret,
    prevEventHash,
    canonicalPayload,
  );

  await storage.upsertAgent({
    agentId: input.agentId,
    tenantId: input.tenantId,
    name: input.agentName ?? input.agentId,
    hyperscaler: input.hyperscaler,
    trustTier: input.trustTier,
  });

  const eventInsert: CanonicalEventInsert = {
    eventId,
    tenantId: input.tenantId,
    decisionId,
    hyperscaler: input.hyperscaler,
    agentId: input.agentId,
    model: input.model,
    inputTokens: input.inputTokens,
    outputTokens: input.outputTokens,
    wallMs: input.wallMs,
    vendorCostUsd: input.vendorCostUsd,
    amortizedCostUsd,
    confidence: input.confidence,
    humanBaselineMinutes: input.humanBaselineMinutes,
    manualHourlyCostUsd: input.manualHourlyCostUsd,
    laborValueSavedUsd,
    passedThresholds: input.passedThresholds,
    policyId: input.policyId,
    trustTier: input.trustTier,
    auditHash,
    prevEventHash,
    capturedVia: input.capturedVia,
  };

  const event = await storage.insertCanonicalEvent(eventInsert);
  await storage.incrementAgentEventCount(input.agentId, input.tenantId);

  const ledgerId = `pel-${randomUUID()}`;
  const predictedCostUsd = input.predictedCostUsd ?? amortizedCostUsd;
  const predictedOutcomeUsd = laborValueSavedUsd;

  const predictedPayload = canonicalize({
    id: ledgerId,
    eventId,
    tenantId: input.tenantId,
    predictedCostUsd,
    predictedOutcomeUsd,
    uefGsti: input.uefGsti,
    uefTac: input.uefTac,
  });
  const predictedSignature = computeHash(
    kms.fuzeboxSecret,
    auditHash,
    predictedPayload,
  );

  const ledgerRow = await storage.insertLedgerRow({
    id: ledgerId,
    eventId,
    tenantId: input.tenantId,
    predictedCostUsd,
    predictedOutcomeUsd,
    uefGsti: input.uefGsti,
    uefTac: input.uefTac,
    predictedSignature,
    cosignStatus: "pending",
  });

  return { event, ledgerRow };
}
