import { Router } from "express";
import { z } from "zod";
import { getStorage } from "../../db/index.js";
import { HttpError } from "../../shared/errors.js";
import { ingestEvent } from "./observation.service.js";
import {
  ingestSchema,
  listEventsQuerySchema,
  getEventQuerySchema,
} from "./observation.types.js";

export function buildObservationRouter(): Router {
  const router = Router();
  const storage = getStorage();

  /**
   * @openapi
   * /observation/ingest:
   *   post:
   *     tags: [Observation]
   *     summary: Ingest a canonical event (Flow 3.1)
   *     description: Creates a canonical event and opens a PEL ledger row with cosignStatus=pending.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [hyperscaler, agentId, model]
   *             properties:
   *               tenantId:
   *                 type: string
   *                 default: ten_demo
   *               hyperscaler:
   *                 type: string
   *                 enum: [anthropic, openai, copilot, uniphore, mistral]
   *               agentId:
   *                 type: string
   *               agentName:
   *                 type: string
   *               model:
   *                 type: string
   *               inputTokens:
   *                 type: integer
   *                 default: 0
   *               outputTokens:
   *                 type: integer
   *                 default: 0
   *               wallMs:
   *                 type: integer
   *                 default: 0
   *               vendorCostUsd:
   *                 type: number
   *                 default: 0
   *               confidence:
   *                 type: number
   *                 minimum: 0
   *                 maximum: 1
   *                 default: 0
   *               humanBaselineMinutes:
   *                 type: number
   *                 default: 0
   *               manualHourlyCostUsd:
   *                 type: number
   *                 default: 0
   *               passedThresholds:
   *                 type: boolean
   *                 default: true
   *               policyId:
   *                 type: string
   *                 default: POL_DEFAULT_V1
   *               trustTier:
   *                 type: string
   *                 enum: [T0_unverified, T1_observed, T2_supervised, T3_delegated, T4_autonomous]
   *                 default: T0_unverified
   *               capturedVia:
   *                 type: string
   *                 enum: [litellm, otel, webhook, ebpf]
   *                 default: litellm
   *               uefGsti:
   *                 type: number
   *                 default: 0
   *               uefTac:
   *                 type: number
   *                 default: 0
   *     responses:
   *       201:
   *         description: Event ingested
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 eventId: { type: string }
   *                 decisionId: { type: string }
   *                 ledgerRowId: { type: string }
   *                 auditHash: { type: string }
   *                 prevEventHash: { type: string }
   *                 predictedSignature: { type: string }
   *                 cosignStatus: { type: string }
   *                 event:
   *                   $ref: '#/components/schemas/CanonicalEvent'
   *                 ledgerRow:
   *                   $ref: '#/components/schemas/LedgerRow'
   *       400:
   *         description: Validation error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ValidationError'
   */
  router.post("/ingest", async (req, res, next) => {
    try {
      const parsed = ingestSchema.parse(req.body ?? {});
      const result = await ingestEvent(storage, parsed);
      res.status(201).json({
        eventId: result.event.eventId,
        decisionId: result.event.decisionId,
        ledgerRowId: result.ledgerRow.id,
        auditHash: result.event.auditHash,
        prevEventHash: result.event.prevEventHash,
        predictedSignature: result.ledgerRow.predictedSignature,
        cosignStatus: result.ledgerRow.cosignStatus,
        event: result.event,
        ledgerRow: result.ledgerRow,
      });
    } catch (err) {
      next(err);
    }
  });

  /**
   * @openapi
   * /observation/events:
   *   get:
   *     tags: [Observation]
   *     summary: List canonical events
   *     parameters:
   *       - $ref: '#/components/parameters/tenantId'
   *       - name: agentId
   *         in: query
   *         schema: { type: string }
   *       - name: hyperscaler
   *         in: query
   *         schema:
   *           type: string
   *           enum: [anthropic, openai, copilot, uniphore, mistral]
   *       - name: startDate
   *         in: query
   *         schema: { type: string, format: date-time }
   *       - name: endDate
   *         in: query
   *         schema: { type: string, format: date-time }
   *       - $ref: '#/components/parameters/limit'
   *       - $ref: '#/components/parameters/offset'
   *     responses:
   *       200:
   *         description: Paginated list of canonical events
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 tenantId: { type: string }
   *                 total: { type: integer }
   *                 limit: { type: integer }
   *                 offset: { type: integer }
   *                 rows:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/CanonicalEvent'
   */
  router.get("/events", async (req, res, next) => {
    try {
      const q = listEventsQuerySchema.parse(req.query);
      const result = await storage.listCanonicalEvents(q);
      res.json({
        tenantId: q.tenantId,
        total: result.total,
        limit: q.limit ?? null,
        offset: q.offset ?? 0,
        rows: result.rows,
      });
    } catch (err) {
      next(err);
    }
  });

  /**
   * @openapi
   * /observation/events/{eventId}:
   *   get:
   *     tags: [Observation]
   *     summary: Get a single canonical event with its ledger row
   *     parameters:
   *       - name: eventId
   *         in: path
   *         required: true
   *         schema: { type: string }
   *       - $ref: '#/components/parameters/tenantId'
   *     responses:
   *       200:
   *         description: Event and ledger row
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 event:
   *                   $ref: '#/components/schemas/CanonicalEvent'
   *                 ledgerRow:
   *                   $ref: '#/components/schemas/LedgerRow'
   *       404:
   *         description: Event not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.get("/events/:eventId", async (req, res, next) => {
    try {
      const q = getEventQuerySchema.parse(req.query);
      const event = await storage.getCanonicalEvent(
        req.params.eventId,
        q.tenantId,
      );
      if (!event) {
        throw new HttpError(404, `event ${req.params.eventId} not found`);
      }
      const ledgerRow = await storage.getLedgerRowByEventId(
        event.eventId,
        q.tenantId,
      );
      res.json({ event, ledgerRow: ledgerRow ?? null });
    } catch (err) {
      next(err);
    }
  });

  const coverageQuerySchema = z.object({
    tenantId: z.string().min(1).default("ten_demo"),
  });

  /**
   * @openapi
   * /observation/coverage:
   *   get:
   *     tags: [Observation]
   *     summary: Coverage manifest — per-surface ingestion status
   *     description: >
   *       Returns active/degraded/gap status per hyperscaler.
   *       active = event in last 24 h, degraded = last 7 d, gap = older.
   *     parameters:
   *       - $ref: '#/components/parameters/tenantId'
   *     responses:
   *       200:
   *         description: Coverage manifest
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 tenantId: { type: string }
   *                 surfaces:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       hyperscaler: { type: string }
   *                       status:
   *                         type: string
   *                         enum: [active, degraded, gap]
   *                       lastEventAt: { type: integer }
   *                       eventCount: { type: integer }
   *                       agentCount: { type: integer }
   */
  router.get("/coverage", async (req, res, next) => {
    try {
      const q = coverageQuerySchema.parse(req.query);
      const { rows } = await storage.listCanonicalEvents({
        tenantId: q.tenantId,
        limit: 500,
      });

      const now = Date.now();
      const DAY_MS = 86_400_000;
      const WEEK_MS = DAY_MS * 7;

      const byHyperscaler: Record<
        string,
        { lastAt: number; count: number; agentIds: Set<string> }
      > = {};

      for (const ev of rows) {
        const ts =
          ev.createdAt instanceof Date
            ? ev.createdAt.getTime()
            : Number(ev.createdAt);
        if (!byHyperscaler[ev.hyperscaler]) {
          byHyperscaler[ev.hyperscaler] = {
            lastAt: ts,
            count: 0,
            agentIds: new Set(),
          };
        }
        const entry = byHyperscaler[ev.hyperscaler];
        if (ts > entry.lastAt) entry.lastAt = ts;
        entry.count++;
        entry.agentIds.add(ev.agentId);
      }

      const surfaces = Object.entries(byHyperscaler).map(
        ([hyperscaler, info]) => {
          const age = now - info.lastAt;
          const status =
            age < DAY_MS ? "active" : age < WEEK_MS ? "degraded" : "gap";
          return {
            hyperscaler,
            status,
            lastEventAt: info.lastAt,
            eventCount: info.count,
            agentCount: info.agentIds.size,
          };
        },
      );

      res.json({ tenantId: q.tenantId, surfaces });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
