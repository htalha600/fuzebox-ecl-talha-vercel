import { Router } from "express";
import { z } from "zod";
import { getStorage } from "../../db/index.js";
import { generateRecommendations } from "./recommendations.service.js";
import { randomUUID } from "node:crypto";

export function buildRecommendationsRouter(): Router {
  const router = Router();
  const storage = getStorage();

  const querySchema = z.object({
    tenantId: z.string().min(1).default("ten_demo"),
    limit: z.coerce.number().int().positive().max(100).default(20),
  });

  /**
   * @openapi
   * /recommendations:
   *   get:
   *     tags: [Recommendations]
   *     summary: Generate ECL-driven recommendations
   *     description: Runs all recommendation templates against recent events and returns prioritised suggestions.
   *     parameters:
   *       - $ref: '#/components/parameters/tenantId'
   *       - name: limit
   *         in: query
   *         description: Number of recent events to analyse (max 100)
   *         schema: { type: integer, default: 20 }
   *     responses:
   *       200:
   *         description: List of recommendations sorted by priority
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 tenantId: { type: string }
   *                 total: { type: integer }
   *                 recommendations:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Recommendation'
   */
  router.get("/", async (req, res, next) => {
    try {
      const q = querySchema.parse(req.query);
      const recs = await generateRecommendations(storage, q.tenantId, q.limit);
      res.json({
        tenantId: q.tenantId,
        total: recs.length,
        recommendations: recs,
      });
    } catch (err) {
      next(err);
    }
  });

  const generateBodySchema = z.object({
    tenantId: z.string().min(1).default("ten_demo"),
    limit: z.coerce.number().int().positive().max(100).default(20),
  });

  /**
   * @openapi
   * /recommendations/generate:
   *   post:
   *     tags: [Recommendations]
   *     summary: Explicitly run all recommendation templates
   *     description: Idempotent — runs all 7 Cognition Plane templates against recent events and returns prioritised suggestions.
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
   *               limit:
   *                 type: integer
   *                 default: 20
   *                 maximum: 100
   *     responses:
   *       200:
   *         description: Generated recommendations sorted by priority
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 tenantId: { type: string }
   *                 total: { type: integer }
   *                 recommendations:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Recommendation'
   */
  router.post("/generate", async (req, res, next) => {
    try {
      const parsed = generateBodySchema.parse(req.body ?? {});
      const recs = await generateRecommendations(
        storage,
        parsed.tenantId,
        parsed.limit,
      );
      res.json({
        tenantId: parsed.tenantId,
        total: recs.length,
        recommendations: recs,
      });
    } catch (err) {
      next(err);
    }
  });

  const decideBodySchema = z.object({
    tenantId: z.string().min(1).default("ten_demo"),
    outcome: z.enum(["adopted", "rejected", "deferred"]),
    rationale: z.string().min(1),
    policyId: z.string().default("POL_DEFAULT_V1"),
  });

  /**
   * @openapi
   * /recommendations/{id}/decide:
   *   post:
   *     tags: [Recommendations]
   *     summary: Adopt, reject, or defer a recommendation
   *     description: Writes a governance_decisions row to close the loop.
   *     parameters:
   *       - name: id
   *         in: path
   *         required: true
   *         schema: { type: string }
   *         description: Recommendation ID (rec-*)
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [outcome, rationale]
   *             properties:
   *               tenantId:
   *                 type: string
   *                 default: ten_demo
   *               outcome:
   *                 type: string
   *                 enum: [adopted, rejected, deferred]
   *               rationale:
   *                 type: string
   *               policyId:
   *                 type: string
   *                 default: POL_DEFAULT_V1
   *     responses:
   *       201:
   *         description: Governance decision written
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/GovernanceDecision'
   *       400:
   *         description: Validation error
   */
  router.post("/:id/decide", async (req, res, next) => {
    try {
      const parsed = decideBodySchema.parse(req.body ?? {});
      const decision = await storage.insertGovernanceDecision({
        id: `gdec-${randomUUID()}`,
        tenantId: parsed.tenantId,
        policyId: parsed.policyId,
        outcome: parsed.outcome,
        recommendationId: req.params.id,
        rationale: parsed.rationale,
        cosignedBy: JSON.stringify({
          fuzeboxKeyId: "fuzebox-kms-dev",
          rpotentialKeyId: "rpotential-kms-dev",
        }),
      });
      res.status(201).json(decision);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
