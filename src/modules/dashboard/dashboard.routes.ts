import { Router } from "express";
import { z } from "zod";
import { getStorage } from "../../db/index.js";
import { generateRecommendations } from "../recommendations/recommendations.service.js";

export function buildDashboardRouter(): Router {
  const router = Router();
  const storage = getStorage();

  const querySchema = z.object({
    tenantId: z.string().min(1).default("ten_demo"),
  });

  /**
   * @openapi
   * /dashboard/summary:
   *   get:
   *     tags: [Dashboard]
   *     summary: Aggregated dashboard summary
   *     description: >
   *       Returns hero KPI card (MER, CUoW, RoP), KPI row (agent/event counts),
   *       latest equation snapshot, and top attention items (high-priority recommendations).
   *     parameters:
   *       - $ref: '#/components/parameters/tenantId'
   *     responses:
   *       200:
   *         description: Dashboard summary
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 tenantId: { type: string }
   *                 hero:
   *                   type: object
   *                   properties:
   *                     mer: { type: number }
   *                     cuow: { type: number }
   *                     rop: { type: number }
   *                 kpis:
   *                   type: object
   *                   properties:
   *                     agentCount: { type: integer }
   *                     eventCount: { type: integer }
   *                     openDecisions: { type: integer }
   *                     tuop: { type: number }
   *                 latestSnapshot:
   *                   $ref: '#/components/schemas/EquationSnapshot'
   *                 attentionItems:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Recommendation'
   */
  router.get("/summary", async (req, res, next) => {
    try {
      const q = querySchema.parse(req.query);
      const tenantId = q.tenantId;

      const [
        { rows: snapshots },
        { total: agentCount },
        { total: eventCount },
        { total: openDecisions },
        allRecs,
      ] = await Promise.all([
        storage.listEquationSnapshots({ tenantId, limit: 1 }),
        storage.listAgents({ tenantId, limit: 1 }),
        storage.listCanonicalEvents({ tenantId, limit: 1 }),
        storage.listGovernanceDecisions({ tenantId, limit: 1 }),
        generateRecommendations(storage, tenantId, 50),
      ]);

      const latestSnapshot = snapshots[0] ?? null;
      const attentionItems = allRecs
        .filter((r) => r.priority === "high")
        .slice(0, 5);

      res.json({
        tenantId,
        hero: {
          mer: latestSnapshot?.mer ?? 0,
          cuow: latestSnapshot?.cuow ?? 0,
          rop: latestSnapshot?.rop ?? 0,
        },
        kpis: {
          agentCount,
          eventCount,
          openDecisions,
          tuop: latestSnapshot?.tuop ?? 0,
        },
        latestSnapshot,
        attentionItems,
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
