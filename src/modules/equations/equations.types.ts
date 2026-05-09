export interface CUoWInput {
  amortizedCostUsd: number;
  outputTokens: number;
}

export interface ABTInput {
  costDelta: number;
  predictedCost: number;
  winRateDelta: number;
  passedThresholds: boolean;
  confidenceReported: number;
}

export interface MERInput {
  laborValueSavedUsd: number;
  amortizedCostUsd: number;
}

export interface CTRInput {
  amortizedCostUsd: number;
  revenueAttributedUsd: number;
}

export interface TVInput {
  actualCostUsd: number;
  predictedCostUsd: number;
}

export interface RoPInput {
  laborValueSavedUsd: number;
  predictedCostUsd: number;
}

export interface TUoPInput {
  eventCount: number;
  trustTier: string;
}
