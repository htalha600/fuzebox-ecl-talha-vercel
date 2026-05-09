import { randomUUID } from "node:crypto";
import type { IStorage } from "../../db/index.js";
import type { EquationSnapshot } from "../../../shared/schema.js";
import { MAX_LIMIT } from "../../config/constants.js";

const TIER_WEIGHTS: Record<string, number> = {
  T0_unverified: 0.1,
  T1_observed: 0.3,
  T2_supervised: 0.6,
  T3_delegated: 0.8,
  T4_autonomous: 1.0,
};

export async function runRollup(
  storage: IStorage,
  tenantId: string,
  windowStart?: Date,
  windowEnd?: Date,
): Promise<EquationSnapshot | null> {
  const { rows: closedRows } = await storage.listLedgerRows({
    tenantId,
    cosignStatus: "complete",
    startDate: windowStart,
    endDate: windowEnd,
    limit: MAX_LIMIT,
  });

  if (closedRows.length === 0) return null;

  const eventIds = closedRows.map((r) => r.eventId);
  const events = await Promise.all(
    eventIds.map((id) => storage.getCanonicalEvent(id, tenantId)),
  );
  const validEvents = events.filter(Boolean) as NonNullable<typeof events[0]>[];

  const totalAmortized = validEvents.reduce((s, e) => s + e.amortizedCostUsd, 0);
  const totalLaborSaved = validEvents.reduce((s, e) => s + e.laborValueSavedUsd, 0);
  const totalPredicted = closedRows.reduce((s, r) => s + r.predictedCostUsd, 0);
  const count = validEvents.length;

  const cuow = count > 0 ? totalAmortized / count : 0;
  const mer = totalAmortized > 0 ? totalLaborSaved / totalAmortized : 0;

  const avgUefTac =
    closedRows.reduce((s, r) => s + r.uefTac, 0) / closedRows.length;
  const ctr = avgUefTac;

  const sigmas = closedRows
    .filter((r) => r.techVarianceSigma != null)
    .map((r) => r.techVarianceSigma!);
  const tv =
    sigmas.length > 0 ? sigmas.reduce((s, v) => s + v, 0) / sigmas.length : 0;

  const rop = totalPredicted > 0 ? totalLaborSaved / totalPredicted : 0;

  const tuop = validEvents.reduce(
    (s, e) => s + (TIER_WEIGHTS[e.trustTier] ?? 0.1),
    0,
  );

  const earliest = validEvents.reduce(
    (min, e) => {
      const ts = e.createdAt instanceof Date ? e.createdAt.getTime() : Number(e.createdAt);
      return ts < min ? ts : min;
    },
    Date.now(),
  );

  return storage.insertEquationSnapshot({
    id: `snap-${randomUUID()}`,
    tenantId,
    cuow: round(cuow),
    mer: round(mer),
    ctr: round(ctr),
    tv: round(tv),
    rop: round(rop),
    tuop: round(tuop),
    eventCount: count,
    windowStart: windowStart ?? new Date(earliest),
    windowEnd: windowEnd ?? new Date(),
    inputHashes: JSON.stringify(eventIds),
  });
}

function round(n: number, decimals = 6): number {
  return parseFloat(n.toFixed(decimals));
}
