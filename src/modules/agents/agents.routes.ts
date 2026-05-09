import { Router } from "express";
import { z } from "zod";
import { getStorage } from "../../db/index.js";
import { HYPERSCALERS, TRUST_TIERS } from "../../config/constants.js";
import { getAgent, registerAgent, listAgents } from "./agents.service.js";

export function buildAgentsRouter(): Router {
  const router = Router();
  const storage = getStorage();

  const createAgentSchema = z.object({
    tenantId: z.string().min(1).default("ten_demo"),
    agentId: z.string().min(1),
    name: z.string().min(1),
    hyperscaler: z.enum(HYPERSCALERS),
    trustTier: z.enum(TRUST_TIERS).default("T0_unverified"),
  });

  const querySchema = z.object({
    tenantId: z.string().min(1).default("ten_demo"),
  });

  const listQuerySchema = z.object({
    tenantId: z.string().min(1).default("ten_demo"),
    limit: z.coerce.number().int().positive().max(500).default(50),
    offset: z.coerce.number().int().nonnegative().default(0),
  });

  /**
   * @openapi
   * /agents:
   *   get:
   *     tags: [Agents]
   *     summary: List all agents for a tenant
   *     parameters:
   *       - $ref: '#/components/parameters/tenantId'
   *       - $ref: '#/components/parameters/limit'
   *       - $ref: '#/components/parameters/offset'
   *     responses:
   *       200:
   *         description: Paginated list of agents
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
   *                     $ref: '#/components/schemas/Agent'
   */
  router.get("/", async (req, res, next) => {
    try {
      const q = listQuerySchema.parse(req.query);
      const result = await listAgents(storage, q.tenantId, q.limit, q.offset);
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

  /**
   * @openapi
   * /agents:
   *   post:
   *     tags: [Agents]
   *     summary: Register or retrieve an agent
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [agentId, name, hyperscaler]
   *             properties:
   *               tenantId:
   *                 type: string
   *                 default: ten_demo
   *               agentId:
   *                 type: string
   *               name:
   *                 type: string
   *               hyperscaler:
   *                 type: string
   *                 enum: [anthropic, openai, copilot, uniphore, mistral]
   *               trustTier:
   *                 type: string
   *                 enum: [T0_unverified, T1_observed, T2_supervised, T3_delegated, T4_autonomous]
   *                 default: T0_unverified
   *     responses:
   *       201:
   *         description: Agent registered
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Agent'
   *       400:
   *         description: Validation error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ValidationError'
   */
  router.post("/", async (req, res, next) => {
    try {
      const parsed = createAgentSchema.parse(req.body ?? {});
      const agent = await registerAgent(storage, parsed);
      res.status(201).json(agent);
    } catch (err) {
      next(err);
    }
  });

  /**
   * @openapi
   * /agents/{agentId}:
   *   get:
   *     tags: [Agents]
   *     summary: Get an agent by ID
   *     parameters:
   *       - name: agentId
   *         in: path
   *         required: true
   *         schema: { type: string }
   *       - $ref: '#/components/parameters/tenantId'
   *     responses:
   *       200:
   *         description: Agent details
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Agent'
   *       404:
   *         description: Agent not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.get("/:agentId", async (req, res, next) => {
    try {
      const q = querySchema.parse(req.query);
      const agent = await getAgent(storage, req.params.agentId, q.tenantId);
      res.json(agent);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
