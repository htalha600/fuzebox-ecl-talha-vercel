// Integration test stub for Flow 3.2 — PEL Reconciliation.
// Run with: tsx tests/integration/reconcile.test.ts

import "dotenv/config";
import { getStorage, closeDb } from "../../src/db/index.js";
import { ingestEvent } from "../../src/modules/observation/observation.service.js";
import { reconcileEvent } from "../../src/modules/ledger/ledger.service.js";

async function testReconcile(): Promise<void> {
  const storage = getStorage();
  const tenantId = "ten_reconcile_test";

  const { event } = await ingestEvent(storage, {
    tenantId,
    hyperscaler: "openai",
    agentId: "agent-reconcile-001",
    model: "gpt-4o",
    inputTokens: 300,
    outputTokens: 150,
    wallMs: 800,
    vendorCostUsd: 0.003,
    confidence: 0.9,
    humanBaselineMinutes: 5,
    manualHourlyCostUsd: 40,
    passedThresholds: true,
    policyId: "POL_DEFAULT_V1",
    trustTier: "T1_observed",
    capturedVia: "litellm",
    uefGsti: 0.75,
    uefTac: 0.7,
  });

  const row = await reconcileEvent(storage, {
    tenantId,
    eventId: event.eventId,
    actualCostUsd: 0.0035,
    actualOutcomeUsd: 3.5,
    actualSourceSor: "billing-api-v2",
  });

  if (row.cosignStatus !== "complete") {
    throw new Error(`expected complete, got ${row.cosignStatus}`);
  }
  if (!row.fuzeboxSig || !row.rpotentialSig) {
    throw new Error("missing cosignatures");
  }
  if (row.closedAt == null) {
    throw new Error("closedAt should be set");
  }
  if (row.attributionBucket == null) {
    throw new Error("attributionBucket should be set");
  }

  console.log("reconcile.test.ts: PASS", {
    cosignStatus: row.cosignStatus,
    attributionBucket: row.attributionBucket,
    techVarianceSigma: row.techVarianceSigma,
    econCostDelta: row.econCostDelta,
  });

  closeDb();
}

testReconcile().catch((err) => {
  console.error("reconcile.test.ts: FAIL", err);
  process.exit(1);
});
