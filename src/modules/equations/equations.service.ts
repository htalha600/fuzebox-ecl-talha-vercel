import type {
  CUoWInput,
  MERInput,
  CTRInput,
  TVInput,
  RoPInput,
  TUoPInput,
} from "./equations.types.js";

// Cost Unit of Work — cost per output token
export function computeCUoW(input: CUoWInput): number {
  if (input.outputTokens === 0) return 0;
  return Number((input.amortizedCostUsd / input.outputTokens).toFixed(8));
}

// Model Economic Return — labor value vs cost ratio
export function computeMER(input: MERInput): number {
  if (input.amortizedCostUsd === 0) return 0;
  return Number((input.laborValueSavedUsd / input.amortizedCostUsd).toFixed(6));
}

// Cost-to-Revenue ratio
export function computeCTR(input: CTRInput): number {
  if (input.revenueAttributedUsd === 0) return 0;
  return Number(
    (input.amortizedCostUsd / input.revenueAttributedUsd).toFixed(6),
  );
}

// Tech Variance — normalized cost deviation from prediction
export function computeTV(input: TVInput): number {
  if (input.predictedCostUsd === 0) return 0;
  return Number(
    (
      Math.abs(input.actualCostUsd - input.predictedCostUsd) /
      input.predictedCostUsd
    ).toFixed(6),
  );
}

// Return on Prediction — predicted return vs predicted cost
export function computeRoP(input: RoPInput): number {
  if (input.predictedCostUsd === 0) return 0;
  return Number(
    (input.laborValueSavedUsd / input.predictedCostUsd).toFixed(6),
  );
}

// Trust Unit of Performance — events per trust tier weight
export function computeTUoP(input: TUoPInput): number {
  const tierWeights: Record<string, number> = {
    T0_unverified: 0.1,
    T1_observed: 0.3,
    T2_supervised: 0.6,
    T3_delegated: 0.85,
    T4_autonomous: 1.0,
  };
  const weight = tierWeights[input.trustTier] ?? 0.1;
  return Number((input.eventCount * weight).toFixed(4));
}
