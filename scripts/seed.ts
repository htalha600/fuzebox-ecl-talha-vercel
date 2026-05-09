// Seed script — populates ten_demo with the canonical demo dataset called for
// in spec v0.6: ~120 canonical events across 6 agents spanning all 5
// hyperscalers, with ~80% reconciled and a rollup snapshot at the end.
//
// Usage:  npm run db:seed
// To re-seed from scratch: delete fuzebox.db* first.

import "dotenv/config";
import { getStorage, closeDb } from "../src/db/index.js";
import { ingestEvent } from "../src/modules/observation/observation.service.js";
import { reconcileEvent } from "../src/modules/ledger/ledger.service.js";
import { runRollup } from "../src/modules/ledger/rollup.service.js";
import type { IngestInput } from "../src/modules/observation/observation.types.js";

const TENANT = "ten_demo";
const TOTAL_EVENTS = 120;
const RECONCILE_FRACTION = 0.8;

// Deterministic LCG so seed output is reproducible.
function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}
const rand = makeRng(0xfb_2026);
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
const between = (lo: number, hi: number) => lo + rand() * (hi - lo);
const intBetween = (lo: number, hi: number) => Math.floor(between(lo, hi + 1));

// 6 agents across all 5 hyperscalers, with varied trust tiers.
const AGENTS = [
  { agentId: "agent-anthro-001", name: "Sonnet Coder",      hyperscaler: "anthropic", model: "claude-3-5-sonnet", trustTier: "T3_delegated"  },
  { agentId: "agent-anthro-002", name: "Haiku Triager",     hyperscaler: "anthropic", model: "claude-3-haiku",    trustTier: "T2_supervised" },
  { agentId: "agent-openai-001", name: "GPT-4o Analyst",    hyperscaler: "openai",    model: "gpt-4o",            trustTier: "T2_supervised" },
  { agentId: "agent-copilot-01", name: "Copilot Pair",      hyperscaler: "copilot",   model: "copilot-chat-v1",   trustTier: "T1_observed"   },
  { agentId: "agent-uniphor-01", name: "Uniphore Voice",    hyperscaler: "uniphore",  model: "uniphore-x1",       trustTier: "T0_unverified" },
  { agentId: "agent-mistral-01", name: "Mistral Drafter",   hyperscaler: "mistral",   model: "mistral-large-2",   trustTier: "T4_autonomous" },
] as const;

async function main(): Promise<void> {
  const storage = getStorage();

  const existing = await storage.listCanonicalEvents({ tenantId: TENANT, limit: 1 });
  if (existing.total > 0) {
    console.log(
      `[seed] tenant ${TENANT} already has ${existing.total} events — skipping.`,
    );
    console.log(`[seed] delete fuzebox.db (and -shm/-wal) to re-seed from scratch.`);
    closeDb();
    return;
  }

  console.log(`[seed] inserting ${TOTAL_EVENTS} canonical events for ${TENANT}…`);

  const eventIds: string[] = [];
  let boundaryViolations = 0;

  for (let i = 0; i < TOTAL_EVENTS; i++) {
    const agent = pick(AGENTS);
    const inputTokens = intBetween(150, 4000);
    const outputTokens = intBetween(50, 1500);
    const wallMs = intBetween(400, 6000);
    // Vendor cost loosely proportional to tokens.
    const vendorCostUsd = Number(
      ((inputTokens * 0.000003) + (outputTokens * 0.000015) * between(0.8, 1.4)).toFixed(6),
    );
    const humanBaselineMinutes = intBetween(5, 45);
    const manualHourlyCostUsd = pick([45, 60, 75, 90, 120]);
    const confidence = Number(between(0.45, 0.98).toFixed(3));

    // ~15% intentionally fail thresholds → exercises boundary_violation on T3+
    const passedThresholds = rand() > 0.15;
    if (!passedThresholds) boundaryViolations++;

    const input: IngestInput = {
      tenantId: TENANT,
      hyperscaler: agent.hyperscaler,
      agentId: agent.agentId,
      agentName: agent.name,
      model: agent.model,
      inputTokens,
      outputTokens,
      wallMs,
      vendorCostUsd,
      confidence,
      humanBaselineMinutes,
      manualHourlyCostUsd,
      passedThresholds,
      policyId: "POL_DEFAULT_V1",
      trustTier: agent.trustTier,
      capturedVia: pick(["litellm", "otel", "webhook", "ebpf"]),
      uefGsti: Number(between(0.5, 0.95).toFixed(3)),
      uefTac: Number(between(0.4, 0.9).toFixed(3)),
    };

    const { event } = await ingestEvent(storage, input);
    eventIds.push(event.eventId);
  }

  console.log(`[seed] ingested ${eventIds.length} events (${boundaryViolations} below thresholds).`);

  // Reconcile ~80% with realistic actuals — produces variance, attribution,
  // and triggers budget_gate on the high-sigma cases.
  const toReconcile = Math.floor(eventIds.length * RECONCILE_FRACTION);
  let cosignComplete = 0;
  for (let i = 0; i < toReconcile; i++) {
    const eventId = eventIds[i];
    const ev = await storage.getCanonicalEvent(eventId, TENANT);
    if (!ev) continue;

    // Actuals drift around the predicted cost; a few events overrun heavily.
    const drift =
      rand() < 0.15
        ? between(1.4, 2.5)        // ~15% overrun → budget_gate
        : between(0.85, 1.18);     // most within ±18%
    const actualCostUsd = Number(
      Math.max(0, ev.amortizedCostUsd * drift).toFixed(6),
    );
    // Outcome usually lands near labor saved, occasionally underperforms.
    const outcomeDrift =
      rand() < 0.12 ? between(0.4, 0.75) : between(0.9, 1.1);
    const actualOutcomeUsd = Number(
      Math.max(0, ev.laborValueSavedUsd * outcomeDrift).toFixed(6),
    );

    const row = await reconcileEvent(storage, {
      tenantId: TENANT,
      eventId,
      actualCostUsd,
      actualOutcomeUsd,
      actualSourceSor: pick(["netsuite", "workday", "salesforce", "snowflake"]),
    });
    if (row.cosignStatus === "complete") cosignComplete++;
  }

  console.log(`[seed] reconciled ${toReconcile} events (${cosignComplete} fully co-signed).`);

  // One rollup so the dashboard has a hero KPI snapshot to display.
  const snap = await runRollup(storage, TENANT);
  if (snap) {
    console.log(
      `[seed] rollup snap-id=${snap.id} cuow=${snap.cuow} mer=${snap.mer} rop=${snap.rop} tuop=${snap.tuop} events=${snap.eventCount}`,
    );
  } else {
    console.log(`[seed] rollup produced no snapshot — no closed rows.`);
  }

  const agentCount = (await storage.listAgents({ tenantId: TENANT, limit: 100 })).total;
  const decisionCount = (await storage.listGovernanceDecisions({ tenantId: TENANT, limit: 1 })).total;
  console.log(
    `[seed] DONE — agents=${agentCount} events=${eventIds.length} governance_decisions=${decisionCount}`,
  );

  closeDb();
}

main().catch((err) => {
  console.error("[seed] FAILED", err);
  process.exit(1);
});
