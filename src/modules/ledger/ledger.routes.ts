import { Router } from "express";
import { z } from "zod";
import { getStorage } from "../../db/index.js";
import { HttpError } from "../../shared/errors.js";
import { reconcileEvent } from "./ledger.service.js";
import { runRollup } from "./rollup.service.js";
import { demoteAgent } from "../governance/governance.service.js";
import {
  reconcileSchema,
  listLedgerQuerySchema,
  getLedgerQuerySchema,
} from "./ledger.types.js";

export function buildLedgerRouter(): Router {
  const router = Router();
  const storage = getStorage();

  /**
   * @openapi
   * /pel/rows:
   *   get:
   *     tags: [Ledger]
   *     summary: List PEL ledger rows
   *     parameters:
   *       - $ref: '#/components/parameters/tenantId'
   *       - name: cosignStatus
   *         in: query
   *         schema:
   *           type: string
   *           enum: [pending, partial, complete]
   *       - name: attributionBucket
   *         in: query
   *         schema:
   *           type: string
   *           enum: [agent, prompt, data, policy, environment]
   *       - name: eventId
   *         in: query
   *         schema: { type: string }
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
   *         description: Paginated list of ledger rows
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
   *                     $ref: '#/components/schemas/LedgerRow'
   */
  router.get("/rows", async (req, res, next) => {
    try {
      const q = listLedgerQuerySchema.parse(req.query);
      const result = await storage.listLedgerRows(q);
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
   * /pel/rows/{eventId}:
   *   get:
   *     tags: [Ledger]
   *     summary: Get ledger row by canonical event ID
   *     parameters:
   *       - name: eventId
   *         in: path
   *         required: true
   *         schema: { type: string }
   *       - $ref: '#/components/parameters/tenantId'
   *     responses:
   *       200:
   *         description: Ledger row
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/LedgerRow'
   *       404:
   *         description: Ledger row not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.get("/rows/:eventId", async (req, res, next) => {
    try {
      const q = getLedgerQuerySchema.parse(req.query);
      const row = await storage.getLedgerRowByEventId(
        req.params.eventId,
        q.tenantId,
      );
      if (!row) {
        throw new HttpError(
          404,
          `ledger row for event ${req.params.eventId} not found`,
        );
      }
      res.json(row);
    } catch (err) {
      next(err);
    }
  });

  /**
   * @openapi
   * /pel/reconcile:
   *   post:
   *     tags: [Ledger]
   *     summary: Reconcile a ledger row with actual values (Flow 3.2)
   *     description: Closes the PEL row, computes variance/attribution, and applies dual co-sign.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [eventId, actualCostUsd, actualOutcomeUsd, actualSourceSor]
   *             properties:
   *               tenantId:
   *                 type: string
   *                 default: ten_demo
   *               eventId:
   *                 type: string
   *               actualCostUsd:
   *                 type: number
   *                 minimum: 0
   *               actualOutcomeUsd:
   *                 type: number
   *                 minimum: 0
   *               actualSourceSor:
   *                 type: string
   *     responses:
   *       200:
   *         description: Ledger row reconciled
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 eventId: { type: string }
   *                 ledgerRowId: { type: string }
   *                 cosignStatus: { type: string }
   *                 fuzeboxSig: { type: string }
   *                 rpotentialSig: { type: string }
   *                 techVarianceSigma: { type: number }
   *                 attributionBucket: { type: string }
   *                 attributionConfidence: { type: number }
   *                 ledgerRow:
   *                   $ref: '#/components/schemas/LedgerRow'
   *       404:
   *         description: Event or ledger row not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       409:
   *         description: Already reconciled
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.post("/reconcile", async (req, res, next) => {
    try {
      const parsed = reconcileSchema.parse(req.body ?? {});
      const row = await reconcileEvent(storage, parsed);
      res.status(200).json({
        eventId: parsed.eventId,
        ledgerRowId: row.id,
        cosignStatus: row.cosignStatus,
        fuzeboxSig: row.fuzeboxSig,
        rpotentialSig: row.rpotentialSig,
        techVarianceSigma: row.techVarianceSigma,
        attributionBucket: row.attributionBucket,
        attributionConfidence: row.attributionConfidence,
        ledgerRow: row,
      });
    } catch (err) {
      next(err);
    }
  });

  const rollupQuerySchema = z.object({
    tenantId: z.string().min(1).default("ten_demo"),
    windowStart: z.string().datetime().optional(),
    windowEnd: z.string().datetime().optional(),
  });

  /**
   * @openapi
   * /pel/rollup:
   *   post:
   *     tags: [Ledger]
   *     summary: Recompute equation snapshot for the tenant window (Flow 3.3)
   *     description: Aggregates all closed ledger rows in the window and writes an equation_snapshots row.
   *     requestBody:
   *       required: false
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               tenantId:
   *                 type: string
   *                 default: ten_demo
   *               windowStart:
   *                 type: string
   *                 format: date-time
   *               windowEnd:
   *                 type: string
   *                 format: date-time
   *     responses:
   *       200:
   *         description: Equation snapshot written
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/EquationSnapshot'
   *       204:
   *         description: No closed rows in window — nothing to rollup
   */
  router.post("/rollup", async (req, res, next) => {
    try {
      const parsed = rollupQuerySchema.parse(req.body ?? {});
      const snapshot = await runRollup(
        storage,
        parsed.tenantId,
        parsed.windowStart ? new Date(parsed.windowStart) : undefined,
        parsed.windowEnd ? new Date(parsed.windowEnd) : undefined,
      );
      if (!snapshot) {
        res.status(204).send();
        return;
      }
      res.json(snapshot);
    } catch (err) {
      next(err);
    }
  });

  const equationsQuerySchema = z.object({
    tenantId: z.string().min(1).default("ten_demo"),
    limit: z.coerce.number().int().positive().max(100).default(20),
    offset: z.coerce.number().int().nonnegative().default(0),
  });

  /**
   * @openapi
   * /pel/equations:
   *   get:
   *     tags: [Ledger]
   *     summary: List equation snapshots
   *     description: Returns the time-series of equation snapshots produced by /pel/rollup.
   *     parameters:
   *       - $ref: '#/components/parameters/tenantId'
   *       - $ref: '#/components/parameters/limit'
   *       - $ref: '#/components/parameters/offset'
   *     responses:
   *       200:
   *         description: Paginated list of equation snapshots
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
   *                     $ref: '#/components/schemas/EquationSnapshot'
   */
  router.get("/equations", async (req, res, next) => {
    try {
      const q = equationsQuerySchema.parse(req.query);
      const result = await storage.listEquationSnapshots(q);
      res.json({
        tenantId: q.tenantId,
        total: result.total,
        limit: q.limit,
        offset: q.offset,
        rows: result.rows,
      });
    } catch (err) {
      next(err);
    }
  });

  const correctionBodySchema = z.object({
    tenantId: z.string().min(1).default("ten_demo"),
    correctionType: z.string().min(1),
    correctionRef: z.string().optional(),
  });

  /**
   * @openapi
   * /pel/rows/{eventId}/correction:
   *   patch:
   *     tags: [Ledger]
   *     summary: Apply a correction to a ledger row (Family 8 trigger)
   *     description: >
   *       Writes correction fields to the ledger row and immediately demotes the
   *       associated agent one trust tier (spec section 3.4 demotion rule).
   *       Writes a governance_decisions row with outcome=blocked.
   *     parameters:
   *       - name: eventId
   *         in: path
   *         required: true
   *         schema: { type: string }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [correctionType]
   *             properties:
   *               tenantId:
   *                 type: string
   *                 default: ten_demo
   *               correctionType:
   *                 type: string
   *                 description: "Family 8 correction type (e.g. cost_correction, output_correction)"
   *               correctionRef:
   *                 type: string
   *                 description: Reference to the correction artifact
   *     responses:
   *       200:
   *         description: Correction applied and agent demoted
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 ledgerRow:
   *                   $ref: '#/components/schemas/LedgerRow'
   *                 trustTransition:
   *                   $ref: '#/components/schemas/TrustTransition'
   *       404:
   *         description: Ledger row or event not found
   */
  router.patch("/rows/:eventId/correction", async (req, res, next) => {
    try {
      const parsed = correctionBodySchema.parse(req.body ?? {});
      const { eventId } = req.params;

      const ledgerRow = await storage.getLedgerRowByEventId(eventId, parsed.tenantId);
      if (!ledgerRow) throw new HttpError(404, `ledger row for event ${eventId} not found`);

      const event = await storage.getCanonicalEvent(eventId, parsed.tenantId);
      if (!event) throw new HttpError(404, `canonical event ${eventId} not found`);

      const updated = await storage.updateLedgerRow(ledgerRow.id, parsed.tenantId, {
        correctionType: parsed.correctionType,
        correctionRef: parsed.correctionRef,
        correctionAppliedAt: new Date(),
      });

      const trustTransition = await demoteAgent(
        storage,
        event.agentId,
        parsed.tenantId,
        `Family 8 correction applied: ${parsed.correctionType}`,
      );

      res.json({ ledgerRow: updated, trustTransition });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
