export const GENESIS_HASH = "GENESIS";
export const DEFAULT_AMORTIZATION_RATE = 1.15;

export const HYPERSCALERS = [
  "anthropic",
  "openai",
  "copilot",
  "uniphore",
  "mistral",
] as const;

export const CAPTURED_VIA = ["litellm", "otel", "webhook", "ebpf"] as const;

export const TRUST_TIERS = [
  "T0_unverified",
  "T1_observed",
  "T2_supervised",
  "T3_delegated",
  "T4_autonomous",
] as const;

export const ATTRIBUTION_BUCKETS = [
  "agent",
  "prompt",
  "data",
  "policy",
  "environment",
] as const;

export const COSIGN_STATUSES = ["pending", "partial", "complete"] as const;

export const DEFAULT_LIMIT = 50;
export const MAX_LIMIT = 500;

export type Hyperscaler = (typeof HYPERSCALERS)[number];
export type CapturedVia = (typeof CAPTURED_VIA)[number];
export type TrustTier = (typeof TRUST_TIERS)[number];
export type AttributionBucket = (typeof ATTRIBUTION_BUCKETS)[number];
export type CosignStatus = (typeof COSIGN_STATUSES)[number];
