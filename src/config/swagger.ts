import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "FuzeBox ECL API",
      version: "0.6.0",
      description:
        "FuzeBox AEOS Economic Cognition Layer — REST API (spec v0.6).\n\n" +
        "Covers the Observation Plane (event ingest), Predictive Economic Ledger (reconcile), " +
        "Agents, Recommendations, and Governance modules.",
      contact: { name: "FuzeBox Platform Team" },
    },
    servers: [{ url: "/api", description: "API v1" }],
    tags: [
      { name: "Observation", description: "Event ingestion and retrieval" },
      { name: "Ledger", description: "Predictive Economic Ledger (PEL)" },
      { name: "Agents", description: "Agent registry" },
      { name: "Recommendations", description: "ECL-driven recommendations" },
      { name: "Governance", description: "Trust ladder management" },
      { name: "Dashboard", description: "Aggregated KPI summary" },
    ],
    components: {
      parameters: {
        tenantId: {
          name: "tenantId",
          in: "query",
          description: "Tenant identifier",
          required: false,
          schema: { type: "string", default: "ten_demo" },
        },
        limit: {
          name: "limit",
          in: "query",
          description: "Page size (max 500)",
          schema: { type: "integer", default: 50 },
        },
        offset: {
          name: "offset",
          in: "query",
          description: "Page offset",
          schema: { type: "integer", default: 0 },
        },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            error: { type: "string" },
            message: { type: "string" },
          },
        },
        ValidationError: {
          type: "object",
          properties: {
            error: { type: "string", example: "ValidationError" },
            issues: { type: "array", items: { type: "object" } },
          },
        },
        CanonicalEvent: {
          type: "object",
          properties: {
            eventId: { type: "string" },
            tenantId: { type: "string" },
            decisionId: { type: "string" },
            hyperscaler: {
              type: "string",
              enum: ["anthropic", "openai", "copilot", "uniphore", "mistral"],
            },
            agentId: { type: "string" },
            model: { type: "string" },
            inputTokens: { type: "integer" },
            outputTokens: { type: "integer" },
            wallMs: { type: "integer" },
            vendorCostUsd: { type: "number" },
            amortizedCostUsd: { type: "number" },
            confidence: { type: "number" },
            humanBaselineMinutes: { type: "number" },
            manualHourlyCostUsd: { type: "number" },
            laborValueSavedUsd: { type: "number" },
            passedThresholds: { type: "boolean" },
            policyId: { type: "string" },
            trustTier: {
              type: "string",
              enum: [
                "T0_unverified",
                "T1_observed",
                "T2_supervised",
                "T3_delegated",
                "T4_autonomous",
              ],
            },
            auditHash: { type: "string" },
            prevEventHash: { type: "string", nullable: true },
            capturedVia: {
              type: "string",
              enum: ["litellm", "otel", "webhook", "ebpf"],
            },
            createdAt: { type: "integer", description: "Unix ms timestamp" },
          },
        },
        LedgerRow: {
          type: "object",
          properties: {
            id: { type: "string" },
            eventId: { type: "string" },
            tenantId: { type: "string" },
            predictedCostUsd: { type: "number" },
            predictedOutcomeUsd: { type: "number" },
            uefGsti: { type: "number" },
            uefTac: { type: "number" },
            predictedSignature: { type: "string" },
            actualCostUsd: { type: "number", nullable: true },
            actualOutcomeUsd: { type: "number", nullable: true },
            actualSourceSor: { type: "string", nullable: true },
            fuzeboxSig: { type: "string", nullable: true },
            rpotentialSig: { type: "string", nullable: true },
            cosignStatus: {
              type: "string",
              enum: ["pending", "partial", "complete"],
            },
            techVarianceSigma: { type: "number", nullable: true },
            techErrorRate: { type: "number", nullable: true },
            econWinRateDelta: { type: "number", nullable: true },
            econCostDelta: { type: "number", nullable: true },
            attributionBucket: { type: "string", nullable: true },
            attributionConfidence: { type: "number", nullable: true },
            createdAt: { type: "integer" },
            closedAt: { type: "integer", nullable: true },
          },
        },
        Agent: {
          type: "object",
          properties: {
            agentId: { type: "string" },
            tenantId: { type: "string" },
            name: { type: "string" },
            hyperscaler: { type: "string" },
            trustTier: { type: "string" },
            status: { type: "string" },
            eventCount: { type: "integer" },
            createdAt: { type: "integer" },
          },
        },
        Recommendation: {
          type: "object",
          properties: {
            id: { type: "string" },
            type: { type: "string" },
            tenantId: { type: "string" },
            agentId: { type: "string" },
            title: { type: "string" },
            description: { type: "string" },
            priority: { type: "string", enum: ["low", "medium", "high"] },
            estimatedSavingsUsd: { type: "number" },
            createdAt: { type: "integer" },
          },
        },
        TrustTransition: {
          type: "object",
          properties: {
            agentId: { type: "string" },
            tenantId: { type: "string" },
            fromTier: { type: "string" },
            toTier: { type: "string" },
            reason: { type: "string" },
            transitionedAt: { type: "integer" },
          },
        },
        EquationSnapshot: {
          type: "object",
          properties: {
            id: { type: "string" },
            tenantId: { type: "string" },
            cuow: { type: "number", nullable: true, description: "Cost per Unit of Work" },
            mer: { type: "number", nullable: true, description: "Margin Efficiency Ratio" },
            ctr: { type: "number", nullable: true, description: "Coordination Tax Ratio" },
            tv: { type: "number", nullable: true, description: "Trust Velocity (avg sigma)" },
            rop: { type: "number", nullable: true, description: "Return on Potential" },
            tuop: { type: "number", nullable: true, description: "Total Units of Potential" },
            eventCount: { type: "integer" },
            windowStart: { type: "integer", nullable: true },
            windowEnd: { type: "integer", nullable: true },
            inputHashes: { type: "string", nullable: true, description: "JSON array of eventIds" },
            createdAt: { type: "integer" },
          },
        },
        GovernanceDecision: {
          type: "object",
          properties: {
            id: { type: "string" },
            tenantId: { type: "string" },
            decisionId: { type: "string", nullable: true },
            policyId: { type: "string" },
            outcome: {
              type: "string",
              enum: ["allowed", "blocked", "deferred", "adopted", "rejected"],
            },
            trustTier: { type: "string", nullable: true },
            recommendationId: { type: "string", nullable: true },
            rationale: { type: "string", nullable: true },
            cosignedBy: { type: "string", nullable: true, description: "JSON: FuzeBox + r-Potential KMS key IDs" },
            createdAt: { type: "integer" },
          },
        },
      },
    },
  },
  apis: ["./src/modules/**/*.routes.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);
