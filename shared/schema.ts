import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  real,
  index,
} from "drizzle-orm/sqlite-core";

// FuzeBox AEOS ECL — DB schema (spec v0.6).
// SQLite via Drizzle. Designed to swap to Postgres with no schema change.
// Every state-changing artifact participates in an HMAC chain — see auditHash,
// predictedSignature, fuzebox_sig, rpotential_sig.

// Enum-like text unions (kept as text for SQLite portability)
// hyperscaler: anthropic | openai | copilot | uniphore | mistral
// capturedVia: litellm | otel | webhook | ebpf
// trustTier:   T0_unverified | T1_observed | T2_supervised | T3_delegated | T4_autonomous
// cosignStatus: pending | partial | complete
// attributionBucket: agent | prompt | data | policy | environment

// Minimal agents table — needed so canonical_events.agentId has a real
// referential anchor (FKs aren't enforced by SQLite by default but the column
// is here for prod parity).
export const agents = sqliteTable(
  "agents",
  {
    agentId: text("agent_id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    name: text("name").notNull(),
    hyperscaler: text("hyperscaler").notNull(),
    trustTier: text("trust_tier").notNull().default("T0_unverified"),
    status: text("status").notNull().default("active"),
    eventCount: integer("event_count").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    tierChangedAt: integer("tier_changed_at", { mode: "timestamp_ms" }),
  },
  (t) => ({
    tenantIdx: index("agents_tenant_idx").on(t.tenantId),
  }),
);

// canonical_events — one row per agent decision. Base node of the audit chain.
export const canonicalEvents = sqliteTable(
  "canonical_events",
  {
    eventId: text("event_id").primaryKey(),
    tenantId: text("tenant_id").notNull().default("ten_demo"),
    decisionId: text("decision_id").notNull(),
    hyperscaler: text("hyperscaler").notNull(),
    agentId: text("agent_id").notNull(),
    model: text("model").notNull(),

    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    wallMs: integer("wall_ms").notNull().default(0),

    vendorCostUsd: real("vendor_cost_usd").notNull().default(0),
    amortizedCostUsd: real("amortized_cost_usd").notNull().default(0),
    confidence: real("confidence").notNull().default(0),

    humanBaselineMinutes: real("human_baseline_minutes").notNull().default(0),
    manualHourlyCostUsd: real("manual_hourly_cost_usd").notNull().default(0),
    laborValueSavedUsd: real("labor_value_saved_usd").notNull().default(0),

    passedThresholds: integer("passed_thresholds", { mode: "boolean" })
      .notNull()
      .default(true),
    policyId: text("policy_id").notNull().default("POL_DEFAULT_V1"),
    trustTier: text("trust_tier").notNull().default("T0_unverified"),

    // HMAC chain
    auditHash: text("audit_hash").notNull(),
    prevEventHash: text("prev_event_hash"),

    capturedVia: text("captured_via").notNull().default("litellm"),

    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({
    tenantIdx: index("canonical_events_tenant_idx").on(t.tenantId),
    agentIdx: index("canonical_events_agent_idx").on(t.agentId),
    tenantCreatedIdx: index("canonical_events_tenant_created_idx").on(
      t.tenantId,
      t.createdAt,
    ),
    decisionIdx: index("canonical_events_decision_idx").on(t.decisionId),
  }),
);

// ledger_rows — five sections per the spec.
//   Section 1 Predicted   (open at ingest)
//   Section 2 Actual      (write at /pel/reconcile)
//   Section 3 Variance    (auto on close)
//   Section 4 Attribution (auto on close)
//   Section 5 Correction  (DIR pipeline)
export const ledgerRows = sqliteTable(
  "ledger_rows",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id").notNull(),
    tenantId: text("tenant_id").notNull().default("ten_demo"),

    // Section 1 — Predicted
    predictedCostUsd: real("predicted_cost_usd").notNull().default(0),
    predictedOutcomeUsd: real("predicted_outcome_usd").notNull().default(0),
    uefGsti: real("uef_gsti").notNull().default(0),
    uefTac: real("uef_tac").notNull().default(0),
    predictedSignature: text("predicted_signature").notNull(),

    // Section 2 — Actual
    actualCostUsd: real("actual_cost_usd"),
    actualOutcomeUsd: real("actual_outcome_usd"),
    actualSourceSor: text("actual_source_sor"),
    fuzeboxSig: text("fuzebox_sig"),
    rpotentialSig: text("rpotential_sig"),
    cosignStatus: text("cosign_status").notNull().default("pending"),

    // Section 3 — Variance
    techVarianceSigma: real("tech_variance_sigma"),
    techErrorRate: real("tech_error_rate"),
    econWinRateDelta: real("econ_win_rate_delta"),
    econCostDelta: real("econ_cost_delta"),

    // Section 4 — Attribution
    attributionBucket: text("attribution_bucket"),
    attributionConfidence: real("attribution_confidence"),

    // Section 5 — Correction
    correctionType: text("correction_type"),
    correctionRef: text("correction_ref"),
    correctionAppliedAt: integer("correction_applied_at", {
      mode: "timestamp_ms",
    }),

    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    closedAt: integer("closed_at", { mode: "timestamp_ms" }),
  },
  (t) => ({
    tenantIdx: index("ledger_rows_tenant_idx").on(t.tenantId),
    eventIdx: index("ledger_rows_event_idx").on(t.eventId),
    cosignIdx: index("ledger_rows_cosign_idx").on(t.cosignStatus),
    attributionIdx: index("ledger_rows_attribution_idx").on(
      t.attributionBucket,
    ),
    tenantCreatedIdx: index("ledger_rows_tenant_created_idx").on(
      t.tenantId,
      t.createdAt,
    ),
  }),
);

// equation_snapshots — produced by /pel/rollup. One per window per tenant.
export const equationSnapshots = sqliteTable(
  "equation_snapshots",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    cuow: real("cuow"),
    mer: real("mer"),
    ctr: real("ctr"),
    tv: real("tv"),
    rop: real("rop"),
    tuop: real("tuop"),
    eventCount: integer("event_count").notNull().default(0),
    windowStart: integer("window_start", { mode: "timestamp_ms" }),
    windowEnd: integer("window_end", { mode: "timestamp_ms" }),
    inputHashes: text("input_hashes"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({
    tenantIdx: index("eq_snapshots_tenant_idx").on(t.tenantId),
    tenantCreatedIdx: index("eq_snapshots_tenant_created_idx").on(
      t.tenantId,
      t.createdAt,
    ),
  }),
);

// governance_decisions — written on policy outcomes, tier changes, rec adoptions.
export const governanceDecisions = sqliteTable(
  "governance_decisions",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    decisionId: text("decision_id"),
    policyId: text("policy_id").notNull().default("POL_DEFAULT_V1"),
    outcome: text("outcome").notNull(),
    agentId: text("agent_id"),
    trustTier: text("trust_tier"),
    recommendationId: text("recommendation_id"),
    rationale: text("rationale"),
    cosignedBy: text("cosigned_by"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({
    tenantIdx: index("gov_decisions_tenant_idx").on(t.tenantId),
    tenantCreatedIdx: index("gov_decisions_tenant_created_idx").on(
      t.tenantId,
      t.createdAt,
    ),
  }),
);

export type Agent = typeof agents.$inferSelect;
export type AgentInsert = typeof agents.$inferInsert;
export type CanonicalEvent = typeof canonicalEvents.$inferSelect;
export type CanonicalEventInsert = typeof canonicalEvents.$inferInsert;
export type LedgerRow = typeof ledgerRows.$inferSelect;
export type LedgerRowInsert = typeof ledgerRows.$inferInsert;
export type EquationSnapshot = typeof equationSnapshots.$inferSelect;
export type EquationSnapshotInsert = typeof equationSnapshots.$inferInsert;
export type GovernanceDecision = typeof governanceDecisions.$inferSelect;
export type GovernanceDecisionInsert = typeof governanceDecisions.$inferInsert;
