/**
 * Shared types for backend API responses consumed by the frontend.
 * Each type matches the contract served by the UI adapter routes mounted
 * at /api/* in src/modules/ui/ui.routes.ts.
 */

export type Snapshot = {
  id: number;
  computedAt: string;
  cuow: number;
  abt: number;
  mer: number;
  ctr: number;
  tv: number;
  rop: number;
  tuop: number;
  huop: number;
  auop: number;
  synergyS: number;
  taskCount: number;
};

export type Summary = {
  counts: {
    events: number;
    ledgerRows: number;
    ledgerOpen: number;
    ledgerClosed: number;
    agents: number;
    newRecommendations: number;
    coverageEntries: number;
    coverageGaps: number;
  };
  economics: {
    laborValueSavedUsd: number;
    amortizedCostUsd: number;
    netSavingsUsd: number;
    weeklyRunRateUsd: number;
    ropAvg: number;
  };
  latestEquations?: Snapshot | null;
};

export type Agent = {
  agentId: string;
  name: string;
  hyperscaler: string;
  model: string;
  trustTier: string;
  status: string;
  vendor?: string;
  createdAt?: string;
};

export type Rec = {
  recId: string;
  title: string;
  rationale: string;
  template: string;
  severity: string;
  status: string;
  predictedDeltaUsd?: number;
  confidence?: number;
  agentId?: string;
  workflowId?: string;
  generatedAt: string;
  decidedAt?: string;
  decidedBy?: string;
};

export type Decision = {
  decisionId: string;
  firedAt: string;
  policyId: string;
  policyOutcome: string;
  rationale?: string;
  prevTrustTier?: string;
  newTrustTier?: string;
  rerouteFromModel?: string;
  rerouteToModel?: string;
};

export type Event = {
  id: number;
  eventId: string;
  capturedAt: string;
  tenantId: string;
  hyperscaler: string;
  endpoint: string;
  transport: string;
  capturedVia: string;
  agentId: string;
  agentKind: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  wallMs: number;
  vendorCostUsd: number;
  amortizedCostUsd: number;
  laborValueSavedUsd: number;
  passedThresholds: boolean;
  trustTier: string;
  auditHash: string;
  prevEventHash?: string;
  policyOutcome?: string;
  uopId?: string;
  ropValue?: number;
};

export type Coverage = {
  hyperscaler: string;
  surface: string;
  status: string;
  activatedAt?: string;
  lastTelemetryAt?: string;
  signedAt?: string;
  signature?: string;
};

export type Row = {
  decisionId: string;
  agentId: string;
  status: string;
  createdAt: string;
  closedAt?: string;
  predictedCostUsd: number;
  predictedOutcomeUsd: number;
  actualCostUsd?: number;
  actualOutcomeUsd?: number;
  techVarianceSigma?: number;
  techErrorRate?: number;
  econWinRateDelta?: number;
  econCostDelta?: number;
  attributionBucket?: string;
  attributionConfidence?: number;
  correctionType?: string;
  correctionRef?: string;
  cosignStatus?: string;
  uefGstiClassification?: string;
  rowHash: string;
  prevRowHash?: string;
};
