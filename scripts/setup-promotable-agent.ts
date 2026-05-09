// Helper for demoing /governance/promote end-to-end.
// Creates `agent-promo-demo` with:
//   - tier T2_supervised, tier_changed_at backdated 45 days
//   - 12 canonical events, all passedThresholds=true (pass rate = 100%)
//   - no blocked governance_decisions
// Result: a promotion to T3_delegated will succeed.
//
// Usage:  npm run db:setup-promo

import "dotenv/config";
import { getDb, getStorage, closeDb } from "../src/db/index.js";
import { ingestEvent } from "../src/modules/observation/observation.service.js";

const TENANT = "ten_demo";
const AGENT_ID = "agent-promo-demo";
const FORTY_FIVE_DAYS_MS = 45 * 24 * 60 * 60 * 1000;

async function main(): Promise<void> {
  const storage = getStorage();
  const db = getDb();

  const existing = await storage.getAgent(AGENT_ID, TENANT);
  if (!existing) {
    console.log(`[setup-promo] creating ${AGENT_ID} at T2_supervised…`);
    await storage.upsertAgent({
      agentId: AGENT_ID,
      tenantId: TENANT,
      name: "Promotion Demo Agent",
      hyperscaler: "anthropic",
      trustTier: "T2_supervised",
    });
  } else {
    console.log(`[setup-promo] ${AGENT_ID} already exists — resetting state.`);
  }

  // Ingest 12 all-passing events through the real service so HMAC chain stays valid.
  const { rows: priorEvents } = await storage.listCanonicalEvents({
    tenantId: TENANT,
    agentId: AGENT_ID,
    limit: 100,
  });
  const need = Math.max(0, 12 - priorEvents.length);
  for (let i = 0; i < need; i++) {
    await ingestEvent(storage, {
      tenantId: TENANT,
      hyperscaler: "anthropic",
      agentId: AGENT_ID,
      agentName: "Promotion Demo Agent",
      model: "claude-3-5-sonnet",
      inputTokens: 600,
      outputTokens: 250,
      wallMs: 1100,
      vendorCostUsd: 0.008,
      confidence: 0.92,
      humanBaselineMinutes: 15,
      manualHourlyCostUsd: 75,
      passedThresholds: true,           // <-- 100% pass rate
      policyId: "POL_DEFAULT_V1",
      trustTier: "T2_supervised",
      capturedVia: "litellm",
      uefGsti: 0.85,
      uefTac: 0.7,
    });
  }

  // Backdate tier_changed_at to 45 days ago + force tier back to T2_supervised
  // (in case a previous run promoted it). Direct SQL — these fields are
  // intentionally not exposed via the API.
  const backdated = Date.now() - FORTY_FIVE_DAYS_MS;
  db.$client
    .prepare(
      "UPDATE agents SET trust_tier = 'T2_supervised', tier_changed_at = ? WHERE agent_id = ? AND tenant_id = ?",
    )
    .run(backdated, AGENT_ID, TENANT);

  // Clear any blocked governance_decisions for this agent (rule 3).
  const cleared = db.$client
    .prepare(
      "DELETE FROM governance_decisions WHERE tenant_id = ? AND agent_id = ? AND outcome = 'blocked'",
    )
    .run(TENANT, AGENT_ID);

  // Verify pass rate.
  const { rows: events } = await storage.listCanonicalEvents({
    tenantId: TENANT,
    agentId: AGENT_ID,
    limit: 100,
  });
  const passed = events.filter((e) => e.passedThresholds).length;
  const passRate = events.length > 0 ? (passed / events.length) * 100 : 0;

  console.log(`[setup-promo] DONE`);
  console.log(`  agentId       = ${AGENT_ID}`);
  console.log(`  tenantId      = ${TENANT}`);
  console.log(`  trustTier     = T2_supervised`);
  console.log(`  tenure        = 45 days (rule 1 ✓)`);
  console.log(`  events        = ${events.length}`);
  console.log(`  passRate      = ${passRate.toFixed(1)}%  (rule 2 ${passRate >= 95 ? "✓" : "✗"})`);
  console.log(`  blockedCleared= ${cleared.changes}    (rule 3 ✓)`);
  console.log("");
  console.log("Now in Postman: POST {{baseUrl}}/governance/promote");
  console.log(JSON.stringify({
    tenantId: TENANT,
    agentId: AGENT_ID,
    targetTier: "T3_delegated",
    reason: "Postman promotion smoke test",
  }, null, 2));

  closeDb();
}

main().catch((err) => {
  console.error("[setup-promo] FAILED", err);
  process.exit(1);
});
