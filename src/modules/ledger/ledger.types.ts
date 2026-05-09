import { z } from "zod";

export const reconcileSchema = z.object({
  tenantId: z.string().min(1).default("ten_demo"),
  eventId: z.string().min(1),
  actualCostUsd: z.number().nonnegative(),
  actualOutcomeUsd: z.number().nonnegative(),
  actualSourceSor: z.string().min(1),
});

export type ReconcileInput = z.infer<typeof reconcileSchema>;

export const listLedgerQuerySchema = z.object({
  tenantId: z.string().min(1).default("ten_demo"),
  cosignStatus: z.enum(["pending", "partial", "complete"]).optional(),
  attributionBucket: z
    .enum(["agent", "prompt", "data", "policy", "environment"])
    .optional(),
  eventId: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  limit: z.coerce.number().int().positive().optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
});

export const getLedgerQuerySchema = z.object({
  tenantId: z.string().min(1).default("ten_demo"),
});
