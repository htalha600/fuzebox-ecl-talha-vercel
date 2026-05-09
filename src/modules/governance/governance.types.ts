import { z } from "zod";
import { TRUST_TIERS } from "../../config/constants.js";

export const TIER_ORDER = [
  "T0_unverified",
  "T1_observed",
  "T2_supervised",
  "T3_delegated",
  "T4_autonomous",
] as const;

export const promoteSchema = z.object({
  tenantId: z.string().min(1).default("ten_demo"),
  agentId: z.string().min(1),
  targetTier: z.enum(TRUST_TIERS),
  reason: z.string().min(1),
});

export type PromoteInput = z.infer<typeof promoteSchema>;

export interface TrustTransition {
  agentId: string;
  tenantId: string;
  fromTier: string;
  toTier: string;
  reason: string;
  transitionedAt: number;
}
