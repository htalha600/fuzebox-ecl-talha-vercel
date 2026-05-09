/**
 * UI adapter routes.
 *
 * Mounted before the canonical /api/* routers in app.ts so that GET requests
 * coming from the React frontend hit these handlers first. The adapters reshape
 * existing storage results into the contracts the frontend was designed
 * against. The original modules remain intact for non-GET methods and other
 * consumers (POST /api/observation/ingest, PATCH /api/pel/rows/:id/correction,
 * POST /api/governance/promote, etc.).
 */

import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { getStorage } from "../../db/index.js";
import { generateRecommendations } from "../recommendations/recommendations.service.js";

const tenantQuery = z.object({
  tenantId: z.string().min(1).default("ten_demo"),
});

function toIso(value: Date | number | null | undefined): string | undefined {
  if (value == null) return undefined;
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}

function recIdFromBackend(id: string): string {
  return id;
}

function severityFromPriority(priority: string): string {
  if (priority === "high") return "high";
  if (priority === "medium") return "medium";
  return "low";
}

export function buildUiRouter(): Router {
  const router = Router();
  const storage = getStorage();

  // ───────────────────────────── /api/agents ─────────────────────────────
  router.get("/agents", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = tenantQuery.parse(req.query);
      const { rows: agents } = await storage.listAgents({ tenantId, limit: 200 });

      const eventsByAgent = new Map<string, string>();
      for (const a of agents) {
        const ev = await storage.listCanonicalEvents({
          tenantId,
          agentId: a.agentId,
          limit: 1,
        });
        if (ev.rows[0]) eventsByAgent.set(a.agentId, ev.rows[0].model);
      }

      const out = agents.map((a) => ({
        agentId: a.agentId,
        name: a.name,
        hyperscaler: a.hyperscaler,
        model: eventsByAgent.get(a.agentId) ?? "—",
        trustTier: a.trustTier,
        status: a.status === "active" ? "green" : a.status,
        vendor: a.hyperscaler,
        createdAt: toIso(a.createdAt),
      }));

      res.json(out);
    } catch (err) {
      next(err);
    }
  });

  // ───────────────────────── /api/dashboard/summary ─────────────────────
  router.get(
    "/dashboard/summary",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { tenantId } = tenantQuery.parse(req.query);

        const [
          { rows: snapshots },
          { rows: allEvents, total: eventCount },
          { rows: ledgerAll, total: ledgerRows },
          { total: agentCount },
          recs,
        ] = await Promise.all([
          storage.listEquationSnapshots({ tenantId, limit: 1 }),
          storage.listCanonicalEvents({ tenantId, limit: 1000 }),
          storage.listLedgerRows({ tenantId, limit: 1000 }),
          storage.listAgents({ tenantId, limit: 1 }),
          generateRecommendations(storage, tenantId, 50),
        ]);

        const snap = snapshots[0] ?? null;

        const laborValueSavedUsd = allEvents.reduce(
          (s, e) => s + (e.laborValueSavedUsd ?? 0),
          0,
        );
        const amortizedCostUsd = allEvents.reduce(
          (s, e) => s + (e.amortizedCostUsd ?? 0),
          0,
        );
        const netSavingsUsd = laborValueSavedUsd - amortizedCostUsd;

        const sevenDaysAgoMs = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const last7 = allEvents.filter(
          (e) => new Date(e.createdAt as unknown as Date).getTime() >= sevenDaysAgoMs,
        );
        const last7Net = last7.reduce(
          (s, e) => s + (e.laborValueSavedUsd ?? 0) - (e.amortizedCostUsd ?? 0),
          0,
        );
        const weeklyRunRateUsd = last7Net;

        const ledgerClosed = ledgerAll.filter((r) => r.actualCostUsd != null).length;
        const ledgerOpen = ledgerRows - ledgerClosed;

        const surfaceMap = new Map<string, number>();
        for (const e of allEvents) {
          surfaceMap.set(e.hyperscaler, (surfaceMap.get(e.hyperscaler) ?? 0) + 1);
        }
        const coverageEntries = surfaceMap.size;
        const coverageGaps = 0;

        const newRecommendations = recs.length;

        res.json({
          economics: {
            laborValueSavedUsd,
            amortizedCostUsd,
            netSavingsUsd,
            weeklyRunRateUsd,
            ropAvg: snap?.rop ?? 0,
          },
          counts: {
            events: eventCount,
            ledgerRows,
            ledgerOpen,
            ledgerClosed,
            agents: agentCount,
            newRecommendations,
            coverageEntries,
            coverageGaps,
          },
          latestEquations: snap
            ? {
                cuow: snap.cuow ?? 0,
                abt: 0,
                mer: snap.mer ?? 0,
                ctr: snap.ctr ?? 0,
                tv: snap.tv ?? 0,
                rop: snap.rop ?? 0,
                tuop: snap.tuop ?? 0,
                huop: 0,
                auop: snap.tuop ?? 0,
                synergyS: 1,
                taskCount: snap.eventCount ?? 0,
              }
            : null,
        });
      } catch (err) {
        next(err);
      }
    },
  );

  // ─────────────────────── /api/governance/decisions ────────────────────
  router.get(
    "/governance/decisions",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { tenantId } = tenantQuery.parse(req.query);
        const { rows } = await storage.listGovernanceDecisions({ tenantId, limit: 200 });
        const out = rows.map((d) => ({
          decisionId: d.decisionId ?? d.id,
          firedAt: toIso(d.createdAt) ?? new Date(0).toISOString(),
          policyId: d.policyId,
          policyOutcome: d.outcome,
          rationale: d.rationale ?? undefined,
          prevTrustTier: undefined,
          newTrustTier: d.trustTier ?? undefined,
          rerouteFromModel: undefined,
          rerouteToModel: undefined,
        }));
        res.json(out);
      } catch (err) {
        next(err);
      }
    },
  );

  // ─────────────────────── /api/observation/coverage ────────────────────
  router.get(
    "/observation/coverage",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { tenantId } = tenantQuery.parse(req.query);
        const { rows: events } = await storage.listCanonicalEvents({
          tenantId,
          limit: 1000,
        });

        const byHyperscaler = new Map<
          string,
          { count: number; lastAt: number }
        >();
        for (const e of events) {
          const ts =
            e.createdAt instanceof Date
              ? e.createdAt.getTime()
              : new Date(e.createdAt as unknown as number).getTime();
          const existing = byHyperscaler.get(e.hyperscaler);
          if (!existing) {
            byHyperscaler.set(e.hyperscaler, { count: 1, lastAt: ts });
          } else {
            existing.count += 1;
            if (ts > existing.lastAt) existing.lastAt = ts;
          }
        }

        const out = Array.from(byHyperscaler.entries()).map(
          ([hyperscaler, agg]) => ({
            hyperscaler,
            surface: "litellm-gateway",
            status: agg.count > 0 ? "active" : "gap",
            activatedAt: new Date(agg.lastAt).toISOString(),
            lastTelemetryAt: new Date(agg.lastAt).toISOString(),
            signedAt: undefined,
            signature: undefined,
          }),
        );
        res.json(out);
      } catch (err) {
        next(err);
      }
    },
  );

  // ───────────────────────── /api/observation/events ────────────────────
  router.get(
    "/observation/events",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { tenantId } = tenantQuery.parse(req.query);
        const limit = Math.min(parseInt(String(req.query.limit ?? "200"), 10) || 200, 1000);
        const { rows: events } = await storage.listCanonicalEvents({
          tenantId,
          limit,
        });

        const ledgerByEvent = new Map<string, { uopId?: string; ropValue?: number; policyOutcome?: string }>();
        for (const e of events) {
          const lr = await storage.getLedgerRowByEventId(e.eventId, tenantId);
          if (lr) {
            ledgerByEvent.set(e.eventId, {
              uopId: lr.id,
              ropValue: lr.predictedOutcomeUsd ?? undefined,
              policyOutcome: lr.cosignStatus ?? undefined,
            });
          }
        }

        const out = events.map((e, i) => {
          const lr = ledgerByEvent.get(e.eventId);
          return {
            id: i + 1,
            eventId: e.eventId,
            tenantId: e.tenantId,
            capturedAt: toIso(e.createdAt) ?? new Date().toISOString(),
            agentId: e.agentId,
            hyperscaler: e.hyperscaler,
            endpoint: "/v1/chat/completions",
            transport: "https",
            capturedVia: e.capturedVia ?? "litellm",
            agentKind: "ai",
            model: e.model,
            inputTokens: e.inputTokens ?? 0,
            outputTokens: e.outputTokens ?? 0,
            wallMs: e.wallMs ?? 0,
            vendorCostUsd: e.vendorCostUsd ?? 0,
            amortizedCostUsd: e.amortizedCostUsd ?? 0,
            laborValueSavedUsd: e.laborValueSavedUsd ?? 0,
            passedThresholds: !!e.passedThresholds,
            trustTier: e.trustTier ?? "T0_unverified",
            auditHash: e.auditHash,
            prevEventHash: e.prevEventHash ?? undefined,
            policyOutcome: lr?.policyOutcome,
            uopId: lr?.uopId,
            ropValue: lr?.ropValue,
          };
        });
        res.json(out);
      } catch (err) {
        next(err);
      }
    },
  );

  // ─────────────────────────── /api/pel/equations ───────────────────────
  router.get(
    "/pel/equations",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { tenantId } = tenantQuery.parse(req.query);
        const { rows: snaps } = await storage.listEquationSnapshots({
          tenantId,
          limit: 200,
        });
        const out = snaps.map((s, i) => ({
          id: i + 1,
          computedAt: toIso(s.createdAt) ?? new Date().toISOString(),
          cuow: s.cuow ?? 0,
          abt: 0,
          mer: s.mer ?? 0,
          ctr: s.ctr ?? 0,
          tv: s.tv ?? 0,
          rop: s.rop ?? 0,
          tuop: s.tuop ?? 0,
          huop: 0,
          auop: s.tuop ?? 0,
          synergyS: 1,
          taskCount: s.eventCount ?? 0,
        }));
        res.json(out);
      } catch (err) {
        next(err);
      }
    },
  );

  // ──────────────────────────── /api/pel/rows ───────────────────────────
  router.get(
    "/pel/rows",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { tenantId } = tenantQuery.parse(req.query);
        const { rows: ledger } = await storage.listLedgerRows({
          tenantId,
          limit: 500,
        });

        const eventCache = new Map<string, { decisionId: string; agentId: string }>();
        for (const r of ledger) {
          if (!eventCache.has(r.eventId)) {
            const ev = await storage.getCanonicalEvent(r.eventId, tenantId);
            if (ev) {
              eventCache.set(r.eventId, {
                decisionId: ev.decisionId,
                agentId: ev.agentId,
              });
            }
          }
        }

        const sorted = [...ledger].sort(
          (a, b) =>
            new Date(a.createdAt as unknown as Date).getTime() -
            new Date(b.createdAt as unknown as Date).getTime(),
        );
        const hashByIndex = new Map<number, string>();
        sorted.forEach((r, i) => hashByIndex.set(i, r.id));

        const out = ledger.map((r) => {
          const ev = eventCache.get(r.eventId);
          const idx = sorted.findIndex((x) => x.id === r.id);
          return {
            decisionId: ev?.decisionId ?? r.eventId,
            agentId: ev?.agentId ?? "—",
            status:
              r.actualCostUsd == null ? "open" : r.cosignStatus ?? "closed",
            createdAt: toIso(r.createdAt) ?? new Date().toISOString(),
            closedAt: toIso(r.closedAt),
            predictedCostUsd: r.predictedCostUsd ?? 0,
            predictedOutcomeUsd: r.predictedOutcomeUsd ?? 0,
            actualCostUsd: r.actualCostUsd ?? undefined,
            actualOutcomeUsd: r.actualOutcomeUsd ?? undefined,
            techVarianceSigma: r.techVarianceSigma ?? undefined,
            techErrorRate: r.techErrorRate ?? undefined,
            econWinRateDelta: r.econWinRateDelta ?? undefined,
            econCostDelta: r.econCostDelta ?? undefined,
            attributionBucket: r.attributionBucket ?? undefined,
            attributionConfidence: r.attributionConfidence ?? undefined,
            correctionType: r.correctionType ?? undefined,
            correctionRef: r.correctionRef ?? undefined,
            cosignStatus: r.cosignStatus,
            uefGstiClassification: undefined,
            rowHash: r.id,
            prevRowHash: idx > 0 ? hashByIndex.get(idx - 1) : undefined,
          };
        });
        res.json(out);
      } catch (err) {
        next(err);
      }
    },
  );

  // ─────────────────────── /api/recommendations (GET) ───────────────────
  router.get(
    "/recommendations",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { tenantId } = tenantQuery.parse(req.query);
        const recs = await generateRecommendations(storage, tenantId, 50);
        const out = recs.map((r) => ({
          recId: recIdFromBackend(r.id),
          title: r.title,
          rationale: r.description,
          template: r.type,
          severity: severityFromPriority(r.priority),
          status: "new",
          predictedDeltaUsd: r.estimatedSavingsUsd,
          confidence: 0.5,
          agentId: r.agentId,
          workflowId: undefined,
          generatedAt: toIso(r.createdAt) ?? new Date().toISOString(),
          decidedAt: undefined,
          decidedBy: undefined,
        }));
        res.json(out);
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}
