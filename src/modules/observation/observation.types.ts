import { z } from "zod";
import {
  HYPERSCALERS,
  CAPTURED_VIA,
  TRUST_TIERS,
} from "../../config/constants.js";
import type { CanonicalEvent, LedgerRow } from "../../../shared/schema.js";

export const ingestSchema = z.object({
  tenantId: z.string().min(1).default("ten_demo"),
  hyperscaler: z.enum(HYPERSCALERS),
  agentId: z.string().min(1),
  agentName: z.string().optional(),
  model: z.string().min(1),
  inputTokens: z.number().int().nonnegative().default(0),
  outputTokens: z.number().int().nonnegative().default(0),
  wallMs: z.number().int().nonnegative().default(0),
  vendorCostUsd: z.number().nonnegative().default(0),
  amortizedCostUsd: z.number().nonnegative().optional(),
  confidence: z.number().min(0).max(1).default(0),
  humanBaselineMinutes: z.number().nonnegative().default(0),
  manualHourlyCostUsd: z.number().nonnegative().default(0),
  passedThresholds: z.boolean().default(true),
  policyId: z.string().default("POL_DEFAULT_V1"),
  trustTier: z.enum(TRUST_TIERS).default("T0_unverified"),
  capturedVia: z.enum(CAPTURED_VIA).default("litellm"),
  predictedCostUsd: z.number().nonnegative().optional(),
  uefGsti: z.number().min(0).max(1).default(0),
  uefTac: z.number().min(0).max(1).default(0),
});

export type IngestInput = z.infer<typeof ingestSchema>;

export interface IngestResult {
  event: CanonicalEvent;
  ledgerRow: LedgerRow;
}

export const listEventsQuerySchema = z.object({
  tenantId: z.string().min(1).default("ten_demo"),
  agentId: z.string().optional(),
  hyperscaler: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  limit: z.coerce.number().int().positive().optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
});

export const getEventQuerySchema = z.object({
  tenantId: z.string().min(1).default("ten_demo"),
});
