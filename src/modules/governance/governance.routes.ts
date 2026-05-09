import { Router } from "express";
import { z } from "zod";
import { getStorage } from "../../db/index.js";
import {
  promoteSchema,
} from "./governance.types.js";
import { promoteAgent, evaluateTrustEligibility } from "./governance.service.js";

export function buildGovernanceRouter(): Router {
  const router = Router();
  const storage = getStorage();

  const eligibilitySchema = z.object({
    tenantId: z.string().min(1).default("ten_demo"),
    agentId: z.string().min(1),
    techVarianceSigma: z.coerce.number().nonnegative().default(0),
  });

  /**
   * @openapi
   * /governance/promote:
   *   post:
   *     tags: [Governance]
   *     summary: Promote an agent to the next trust tier
   *     description: Advances an agent one step up the trust ladder. Step-by-step only.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [agentId, targetTier, reason]
   *             properties:
   *               tenantId:
   *                 type: string
   *                 default: ten_demo
   *               agentId:
   *                 type: string
   *               targetTier:
   *                 type: string
   *                 enum: [T0_unverified, T1_observed, T2_supervised, T3_delegated, T4_autonomous]
   *               reason:
   *                 type: string
   *     responses:
   *       200:
   *         description: Trust transition record
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/TrustTransition'
   *       400:
   *         description: Invalid tier transition
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       404:
   *         description: Agent not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.post("/promote", async (req, res, next) => {
    try {
      const parsed = promoteSchema.parse(req.body ?? {});
      const transition = await promoteAgent(storage, parsed);
      res.json(transition);
    } catch (err) {
      next(err);
    }
  });

  /**
   * @openapi
   * /governance/eligibility:
   *   get:
   *     tags: [Governance]
   *     summary: Check if an agent is eligible for tier promotion
   *     parameters:
   *       - $ref: '#/components/parameters/tenantId'
   *       - name: agentId
   *         in: query
   *         required: true
   *         schema: { type: string }
   *       - name: techVarianceSigma
   *         in: query
   *         schema: { type: number, default: 0 }
   *     responses:
   *       200:
   *         description: Eligibility result
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 agentId: { type: string }
   *                 currentTier: { type: string }
   *                 eventCount: { type: integer }
   *                 eligible: { type: boolean }
   *                 reason: { type: string }
   *       404:
   *         description: Agent not found
   */
  router.get("/eligibility", async (req, res, next) => {
    try {
      const q = eligibilitySchema.parse(req.query);
      const agent = await storage.getAgent(q.agentId, q.tenantId);
      if (!agent) {
        res.status(404).json({ error: "HttpError", message: `agent ${q.agentId} not found` });
        return;
      }
      const result = evaluateTrustEligibility(
        agent.eventCount,
        q.techVarianceSigma,
        agent.trustTier,
      );
      res.json({
        agentId: agent.agentId,
        currentTier: agent.trustTier,
        eventCount: agent.eventCount,
        ...result,
      });
    } catch (err) {
      next(err);
    }
  });

  const decisionsQuerySchema = z.object({
    tenantId: z.string().min(1).default("ten_demo"),
    limit: z.coerce.number().int().positive().max(500).default(50),
    offset: z.coerce.number().int().nonnegative().default(0),
  });

  /**
   * @openapi
   * /governance/decisions:
   *   get:
   *     tags: [Governance]
   *     summary: Audit log of all governance decisions
   *     description: HMAC-chain verifiable log of policy outcomes, tier changes, and recommendation adoptions.
   *     parameters:
   *       - $ref: '#/components/parameters/tenantId'
   *       - $ref: '#/components/parameters/limit'
   *       - $ref: '#/components/parameters/offset'
   *     responses:
   *       200:
   *         description: Paginated list of governance decisions
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
   *                     $ref: '#/components/schemas/GovernanceDecision'
   */
  router.get("/decisions", async (req, res, next) => {
    try {
      const q = decisionsQuerySchema.parse(req.query);
      const result = await storage.listGovernanceDecisions(q);
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

  return router;
}
