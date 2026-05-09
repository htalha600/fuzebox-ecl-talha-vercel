import { randomUUID } from "node:crypto";
import type { IStorage } from "../../db/index.js";
import type { CanonicalEvent, LedgerRow } from "../../../shared/schema.js";
import { costOptimTemplate } from "./templates/cost_optim.js";
import { vendorSwapTemplate } from "./templates/vendor_swap.js";
import { budgetGateTemplate } from "./templates/budget_gate.js";
import { gstiDriftTemplate } from "./templates/gsti_drift.js";
import { boundaryViolationTemplate } from "./templates/boundary_violation.js";
import { skillPreserveTemplate } from "./templates/skill_preserve.js";
import { trustPromotionTemplate } from "./templates/trust_promotion.js";

export interface Recommendation {
  id: string;
  type: string;
  tenantId: string;
  agentId: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  estimatedSavingsUsd: number;
  createdAt: number;
}

export type RecommendationTemplate = (
  event: CanonicalEvent,
  ledger: LedgerRow | undefined,
) => Recommendation | null;

const TEMPLATES: RecommendationTemplate[] = [
  costOptimTemplate,
  vendorSwapTemplate,
  budgetGateTemplate,
  gstiDriftTemplate,
  boundaryViolationTemplate,
  skillPreserveTemplate,
  trustPromotionTemplate,
];

export async function generateRecommendations(
  storage: IStorage,
  tenantId: string,
  limit = 20,
): Promise<Recommendation[]> {
  const { rows: events } = await storage.listCanonicalEvents({
    tenantId,
    limit,
  });

  const recommendations: Recommendation[] = [];

  for (const event of events) {
    const ledger = await storage.getLedgerRowByEventId(event.eventId, tenantId);
    for (const template of TEMPLATES) {
      const rec = template(event, ledger);
      if (rec) recommendations.push(rec);
    }
  }

  return recommendations.sort((a, b) => {
    const priority = { high: 3, medium: 2, low: 1 };
    return priority[b.priority] - priority[a.priority];
  });
}

export function makeRecommendation(
  event: CanonicalEvent,
  type: string,
  title: string,
  description: string,
  priority: "low" | "medium" | "high",
  estimatedSavingsUsd = 0,
): Recommendation {
  return {
    id: `rec-${randomUUID()}`,
    type,
    tenantId: event.tenantId,
    agentId: event.agentId,
    title,
    description,
    priority,
    estimatedSavingsUsd,
    createdAt: Date.now(),
  };
}
