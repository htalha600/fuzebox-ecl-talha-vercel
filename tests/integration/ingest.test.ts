// Integration test stub for Flow 3.1 — Event Ingestion.
// Run with: tsx tests/integration/ingest.test.ts
// Requires a running server or inline DB setup.

import "dotenv/config";
import { getStorage, closeDb } from "../../src/db/index.js";
import { ingestEvent } from "../../src/modules/observation/observation.service.js";

async function testIngest(): Promise<void> {
  const storage = getStorage();

  const result = await ingestEvent(storage, {
    tenantId: "ten_test",
    hyperscaler: "anthropic",
    agentId: "agent-test-001",
    agentName: "Test Agent",
    model: "claude-3-5-sonnet",
    inputTokens: 500,
    outputTokens: 200,
    wallMs: 1200,
    vendorCostUsd: 0.005,
    confidence: 0.85,
    humanBaselineMinutes: 10,
    manualHourlyCostUsd: 50,
    passedThresholds: true,
    policyId: "POL_DEFAULT_V1",
    trustTier: "T0_unverified",
    capturedVia: "litellm",
    uefGsti: 0.8,
    uefTac: 0.75,
  });

  if (!result.event.eventId.startsWith("evt-")) {
    throw new Error("eventId format invalid");
  }
  if (result.ledgerRow.cosignStatus !== "pending") {
    throw new Error("new ledger row should be pending");
  }
  if (!result.event.auditHash || result.event.auditHash.length !== 64) {
    throw new Error("auditHash should be 64-char hex");
  }

  console.log("ingest.test.ts: PASS", {
    eventId: result.event.eventId,
    ledgerRowId: result.ledgerRow.id,
    auditHash: result.event.auditHash.slice(0, 16) + "...",
  });

  closeDb();
}

testIngest().catch((err) => {
  console.error("ingest.test.ts: FAIL", err);
  process.exit(1);
});
