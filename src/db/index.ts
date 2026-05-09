import Database from "better-sqlite3";
import {
  drizzle,
  type BetterSQLite3Database,
} from "drizzle-orm/better-sqlite3";
import { and, desc, eq, gte, lte, type SQL } from "drizzle-orm";
import {
  agents,
  canonicalEvents,
  ledgerRows,
  equationSnapshots,
  governanceDecisions,
  type Agent,
  type AgentInsert,
  type CanonicalEvent,
  type CanonicalEventInsert,
  type LedgerRow,
  type LedgerRowInsert,
  type EquationSnapshot,
  type EquationSnapshotInsert,
  type GovernanceDecision,
  type GovernanceDecisionInsert,
} from "../../shared/schema.js";
import { env } from "../config/env.js";
import { DEFAULT_LIMIT, MAX_LIMIT } from "../config/constants.js";

export type DB = BetterSQLite3Database<{
  agents: typeof agents;
  canonicalEvents: typeof canonicalEvents;
  ledgerRows: typeof ledgerRows;
  equationSnapshots: typeof equationSnapshots;
  governanceDecisions: typeof governanceDecisions;
}>;

export interface ListEventsFilter {
  tenantId: string;
  agentId?: string;
  hyperscaler?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface ListLedgerRowsFilter {
  tenantId: string;
  cosignStatus?: string;
  attributionBucket?: string;
  eventId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface ListAgentsFilter {
  tenantId: string;
  limit?: number;
  offset?: number;
}

export interface ListEquationSnapshotsFilter {
  tenantId: string;
  limit?: number;
  offset?: number;
}

export interface ListGovernanceDecisionsFilter {
  tenantId: string;
  agentId?: string;
  outcome?: string;
  limit?: number;
  offset?: number;
}

export interface IStorage {
  upsertAgent(agent: AgentInsert): Promise<Agent>;
  getAgent(agentId: string, tenantId: string): Promise<Agent | undefined>;
  listAgents(filter: ListAgentsFilter): Promise<{ rows: Agent[]; total: number }>;
  updateAgent(
    agentId: string,
    tenantId: string,
    patch: Partial<Pick<AgentInsert, "trustTier" | "tierChangedAt" | "status">>,
  ): Promise<Agent | undefined>;
  incrementAgentEventCount(agentId: string, tenantId: string): Promise<void>;

  insertCanonicalEvent(event: CanonicalEventInsert): Promise<CanonicalEvent>;
  getCanonicalEvent(
    eventId: string,
    tenantId: string,
  ): Promise<CanonicalEvent | undefined>;
  getLastCanonicalEventForTenant(
    tenantId: string,
  ): Promise<CanonicalEvent | undefined>;
  listCanonicalEvents(filter: ListEventsFilter): Promise<{
    rows: CanonicalEvent[];
    total: number;
  }>;

  insertLedgerRow(row: LedgerRowInsert): Promise<LedgerRow>;
  getLedgerRowByEventId(
    eventId: string,
    tenantId: string,
  ): Promise<LedgerRow | undefined>;
  updateLedgerRow(
    id: string,
    tenantId: string,
    patch: Partial<LedgerRowInsert>,
  ): Promise<LedgerRow | undefined>;
  listLedgerRows(filter: ListLedgerRowsFilter): Promise<{
    rows: LedgerRow[];
    total: number;
  }>;

  insertEquationSnapshot(snap: EquationSnapshotInsert): Promise<EquationSnapshot>;
  listEquationSnapshots(filter: ListEquationSnapshotsFilter): Promise<{
    rows: EquationSnapshot[];
    total: number;
  }>;

  insertGovernanceDecision(decision: GovernanceDecisionInsert): Promise<GovernanceDecision>;
  listGovernanceDecisions(filter: ListGovernanceDecisionsFilter): Promise<{
    rows: GovernanceDecision[];
    total: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  constructor(private readonly db: DB) {}

  async upsertAgent(agent: AgentInsert): Promise<Agent> {
    const existing = await this.getAgent(agent.agentId, agent.tenantId);
    if (existing) return existing;
    const inserted = this.db.insert(agents).values(agent).returning().all();
    return inserted[0];
  }

  async getAgent(
    agentId: string,
    tenantId: string,
  ): Promise<Agent | undefined> {
    const rows = this.db
      .select()
      .from(agents)
      .where(and(eq(agents.agentId, agentId), eq(agents.tenantId, tenantId)))
      .limit(1)
      .all();
    return rows[0];
  }

  async listAgents(filter: ListAgentsFilter): Promise<{ rows: Agent[]; total: number }> {
    const where = eq(agents.tenantId, filter.tenantId);
    const limit = clampLimit(filter.limit);
    const offset = filter.offset ?? 0;
    const rows = this.db
      .select()
      .from(agents)
      .where(where)
      .orderBy(desc(agents.createdAt))
      .limit(limit)
      .offset(offset)
      .all();
    const totalRows = this.db.select().from(agents).where(where).all();
    return { rows, total: totalRows.length };
  }

  async updateAgent(
    agentId: string,
    tenantId: string,
    patch: Partial<Pick<AgentInsert, "trustTier" | "tierChangedAt" | "status">>,
  ): Promise<Agent | undefined> {
    const updated = this.db
      .update(agents)
      .set(patch)
      .where(and(eq(agents.agentId, agentId), eq(agents.tenantId, tenantId)))
      .returning()
      .all();
    return updated[0];
  }

  async incrementAgentEventCount(
    agentId: string,
    tenantId: string,
  ): Promise<void> {
    const existing = await this.getAgent(agentId, tenantId);
    if (!existing) return;
    this.db
      .update(agents)
      .set({ eventCount: existing.eventCount + 1 })
      .where(and(eq(agents.agentId, agentId), eq(agents.tenantId, tenantId)))
      .run();
  }

  async insertCanonicalEvent(
    event: CanonicalEventInsert,
  ): Promise<CanonicalEvent> {
    const inserted = this.db
      .insert(canonicalEvents)
      .values(event)
      .returning()
      .all();
    return inserted[0];
  }

  async getCanonicalEvent(
    eventId: string,
    tenantId: string,
  ): Promise<CanonicalEvent | undefined> {
    const rows = this.db
      .select()
      .from(canonicalEvents)
      .where(
        and(
          eq(canonicalEvents.eventId, eventId),
          eq(canonicalEvents.tenantId, tenantId),
        ),
      )
      .limit(1)
      .all();
    return rows[0];
  }

  async getLastCanonicalEventForTenant(
    tenantId: string,
  ): Promise<CanonicalEvent | undefined> {
    const rows = this.db
      .select()
      .from(canonicalEvents)
      .where(eq(canonicalEvents.tenantId, tenantId))
      .orderBy(desc(canonicalEvents.createdAt))
      .limit(1)
      .all();
    return rows[0];
  }

  async listCanonicalEvents(filter: ListEventsFilter): Promise<{
    rows: CanonicalEvent[];
    total: number;
  }> {
    const conditions: SQL[] = [eq(canonicalEvents.tenantId, filter.tenantId)];
    if (filter.agentId)
      conditions.push(eq(canonicalEvents.agentId, filter.agentId));
    if (filter.hyperscaler)
      conditions.push(eq(canonicalEvents.hyperscaler, filter.hyperscaler));
    if (filter.startDate)
      conditions.push(gte(canonicalEvents.createdAt, filter.startDate));
    if (filter.endDate)
      conditions.push(lte(canonicalEvents.createdAt, filter.endDate));

    const where = conditions.length === 1 ? conditions[0] : and(...conditions);
    const limit = clampLimit(filter.limit);
    const offset = filter.offset ?? 0;

    const rows = this.db
      .select()
      .from(canonicalEvents)
      .where(where)
      .orderBy(desc(canonicalEvents.createdAt))
      .limit(limit)
      .offset(offset)
      .all();

    const totalRows = this.db
      .select()
      .from(canonicalEvents)
      .where(where)
      .all();
    return { rows, total: totalRows.length };
  }

  async insertLedgerRow(row: LedgerRowInsert): Promise<LedgerRow> {
    const inserted = this.db.insert(ledgerRows).values(row).returning().all();
    return inserted[0];
  }

  async getLedgerRowByEventId(
    eventId: string,
    tenantId: string,
  ): Promise<LedgerRow | undefined> {
    const rows = this.db
      .select()
      .from(ledgerRows)
      .where(
        and(
          eq(ledgerRows.eventId, eventId),
          eq(ledgerRows.tenantId, tenantId),
        ),
      )
      .limit(1)
      .all();
    return rows[0];
  }

  async updateLedgerRow(
    id: string,
    tenantId: string,
    patch: Partial<LedgerRowInsert>,
  ): Promise<LedgerRow | undefined> {
    const updated = this.db
      .update(ledgerRows)
      .set(patch)
      .where(and(eq(ledgerRows.id, id), eq(ledgerRows.tenantId, tenantId)))
      .returning()
      .all();
    return updated[0];
  }

  async listLedgerRows(filter: ListLedgerRowsFilter): Promise<{
    rows: LedgerRow[];
    total: number;
  }> {
    const conditions: SQL[] = [eq(ledgerRows.tenantId, filter.tenantId)];
    if (filter.cosignStatus)
      conditions.push(eq(ledgerRows.cosignStatus, filter.cosignStatus));
    if (filter.attributionBucket)
      conditions.push(
        eq(ledgerRows.attributionBucket, filter.attributionBucket),
      );
    if (filter.eventId)
      conditions.push(eq(ledgerRows.eventId, filter.eventId));
    if (filter.startDate)
      conditions.push(gte(ledgerRows.createdAt, filter.startDate));
    if (filter.endDate)
      conditions.push(lte(ledgerRows.createdAt, filter.endDate));

    const where = conditions.length === 1 ? conditions[0] : and(...conditions);
    const limit = clampLimit(filter.limit);
    const offset = filter.offset ?? 0;

    const rows = this.db
      .select()
      .from(ledgerRows)
      .where(where)
      .orderBy(desc(ledgerRows.createdAt))
      .limit(limit)
      .offset(offset)
      .all();

    const totalRows = this.db.select().from(ledgerRows).where(where).all();
    return { rows, total: totalRows.length };
  }

  async insertEquationSnapshot(snap: EquationSnapshotInsert): Promise<EquationSnapshot> {
    const inserted = this.db.insert(equationSnapshots).values(snap).returning().all();
    return inserted[0];
  }

  async listEquationSnapshots(filter: ListEquationSnapshotsFilter): Promise<{
    rows: EquationSnapshot[];
    total: number;
  }> {
    const where = eq(equationSnapshots.tenantId, filter.tenantId);
    const limit = clampLimit(filter.limit);
    const offset = filter.offset ?? 0;
    const rows = this.db
      .select()
      .from(equationSnapshots)
      .where(where)
      .orderBy(desc(equationSnapshots.createdAt))
      .limit(limit)
      .offset(offset)
      .all();
    const totalRows = this.db.select().from(equationSnapshots).where(where).all();
    return { rows, total: totalRows.length };
  }

  async insertGovernanceDecision(decision: GovernanceDecisionInsert): Promise<GovernanceDecision> {
    const inserted = this.db.insert(governanceDecisions).values(decision).returning().all();
    return inserted[0];
  }

  async listGovernanceDecisions(filter: ListGovernanceDecisionsFilter): Promise<{
    rows: GovernanceDecision[];
    total: number;
  }> {
    const conditions: SQL[] = [eq(governanceDecisions.tenantId, filter.tenantId)];
    if (filter.agentId)
      conditions.push(eq(governanceDecisions.agentId, filter.agentId));
    if (filter.outcome)
      conditions.push(eq(governanceDecisions.outcome, filter.outcome));
    const where = conditions.length === 1 ? conditions[0] : and(...conditions);
    const limit = clampLimit(filter.limit);
    const offset = filter.offset ?? 0;
    const rows = this.db
      .select()
      .from(governanceDecisions)
      .where(where)
      .orderBy(desc(governanceDecisions.createdAt))
      .limit(limit)
      .offset(offset)
      .all();
    const totalRows = this.db.select().from(governanceDecisions).where(where).all();
    return { rows, total: totalRows.length };
  }
}

function clampLimit(raw: number | undefined): number {
  if (!raw || raw <= 0) return DEFAULT_LIMIT;
  return Math.min(raw, MAX_LIMIT);
}

let cachedDb: DB | undefined;
let cachedSqlite: Database.Database | undefined;

export function getDb(): DB {
  if (cachedDb) return cachedDb;
  const sqlite = new Database(env.DATABASE_URL);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  cachedSqlite = sqlite;
  cachedDb = drizzle(sqlite, {
    schema: { agents, canonicalEvents, ledgerRows, equationSnapshots, governanceDecisions },
  });
  bootstrapSchema(sqlite);
  return cachedDb;
}

export function getStorage(): IStorage {
  return new DatabaseStorage(getDb());
}

export function closeDb(): void {
  cachedSqlite?.close();
  cachedDb = undefined;
  cachedSqlite = undefined;
}

function bootstrapSchema(sqlite: Database.Database): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      agent_id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      name TEXT NOT NULL,
      hyperscaler TEXT NOT NULL,
      trust_tier TEXT NOT NULL DEFAULT 'T0_unverified',
      status TEXT NOT NULL DEFAULT 'active',
      event_count INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      tier_changed_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS agents_tenant_idx ON agents(tenant_id);

    CREATE TABLE IF NOT EXISTS canonical_events (
      event_id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL DEFAULT 'ten_demo',
      decision_id TEXT NOT NULL,
      hyperscaler TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      model TEXT NOT NULL,
      input_tokens INTEGER NOT NULL DEFAULT 0,
      output_tokens INTEGER NOT NULL DEFAULT 0,
      wall_ms INTEGER NOT NULL DEFAULT 0,
      vendor_cost_usd REAL NOT NULL DEFAULT 0,
      amortized_cost_usd REAL NOT NULL DEFAULT 0,
      confidence REAL NOT NULL DEFAULT 0,
      human_baseline_minutes REAL NOT NULL DEFAULT 0,
      manual_hourly_cost_usd REAL NOT NULL DEFAULT 0,
      labor_value_saved_usd REAL NOT NULL DEFAULT 0,
      passed_thresholds INTEGER NOT NULL DEFAULT 1,
      policy_id TEXT NOT NULL DEFAULT 'POL_DEFAULT_V1',
      trust_tier TEXT NOT NULL DEFAULT 'T0_unverified',
      audit_hash TEXT NOT NULL,
      prev_event_hash TEXT,
      captured_via TEXT NOT NULL DEFAULT 'litellm',
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );
    CREATE INDEX IF NOT EXISTS canonical_events_tenant_idx ON canonical_events(tenant_id);
    CREATE INDEX IF NOT EXISTS canonical_events_agent_idx ON canonical_events(agent_id);
    CREATE INDEX IF NOT EXISTS canonical_events_tenant_created_idx ON canonical_events(tenant_id, created_at);
    CREATE INDEX IF NOT EXISTS canonical_events_decision_idx ON canonical_events(decision_id);

    CREATE TABLE IF NOT EXISTS ledger_rows (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      tenant_id TEXT NOT NULL DEFAULT 'ten_demo',
      predicted_cost_usd REAL NOT NULL DEFAULT 0,
      predicted_outcome_usd REAL NOT NULL DEFAULT 0,
      uef_gsti REAL NOT NULL DEFAULT 0,
      uef_tac REAL NOT NULL DEFAULT 0,
      predicted_signature TEXT NOT NULL,
      actual_cost_usd REAL,
      actual_outcome_usd REAL,
      actual_source_sor TEXT,
      fuzebox_sig TEXT,
      rpotential_sig TEXT,
      cosign_status TEXT NOT NULL DEFAULT 'pending',
      tech_variance_sigma REAL,
      tech_error_rate REAL,
      econ_win_rate_delta REAL,
      econ_cost_delta REAL,
      attribution_bucket TEXT,
      attribution_confidence REAL,
      correction_type TEXT,
      correction_ref TEXT,
      correction_applied_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      closed_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS ledger_rows_tenant_idx ON ledger_rows(tenant_id);
    CREATE INDEX IF NOT EXISTS ledger_rows_event_idx ON ledger_rows(event_id);
    CREATE INDEX IF NOT EXISTS ledger_rows_cosign_idx ON ledger_rows(cosign_status);
    CREATE INDEX IF NOT EXISTS ledger_rows_attribution_idx ON ledger_rows(attribution_bucket);
    CREATE INDEX IF NOT EXISTS ledger_rows_tenant_created_idx ON ledger_rows(tenant_id, created_at);

    CREATE TABLE IF NOT EXISTS equation_snapshots (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      cuow REAL,
      mer REAL,
      ctr REAL,
      tv REAL,
      rop REAL,
      tuop REAL,
      event_count INTEGER NOT NULL DEFAULT 0,
      window_start INTEGER,
      window_end INTEGER,
      input_hashes TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );
    CREATE INDEX IF NOT EXISTS eq_snapshots_tenant_idx ON equation_snapshots(tenant_id);
    CREATE INDEX IF NOT EXISTS eq_snapshots_tenant_created_idx ON equation_snapshots(tenant_id, created_at);

    CREATE TABLE IF NOT EXISTS governance_decisions (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      decision_id TEXT,
      policy_id TEXT NOT NULL DEFAULT 'POL_DEFAULT_V1',
      outcome TEXT NOT NULL,
      agent_id TEXT,
      trust_tier TEXT,
      recommendation_id TEXT,
      rationale TEXT,
      cosigned_by TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );
    CREATE INDEX IF NOT EXISTS gov_decisions_tenant_idx ON governance_decisions(tenant_id);
    CREATE INDEX IF NOT EXISTS gov_decisions_tenant_created_idx ON governance_decisions(tenant_id, created_at);
  `);
  // Idempotent column additions for pre-existing databases
  const migrations = [
    "ALTER TABLE agents ADD COLUMN tier_changed_at INTEGER",
    "ALTER TABLE governance_decisions ADD COLUMN agent_id TEXT",
  ];
  for (const sql of migrations) {
    try { sqlite.exec(sql); } catch { /* column already exists */ }
  }
}
