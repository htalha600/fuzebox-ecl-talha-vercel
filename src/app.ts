import express from "express";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger.js";
import { buildObservationRouter } from "./modules/observation/observation.routes.js";
import { buildLedgerRouter } from "./modules/ledger/ledger.routes.js";
import { buildAgentsRouter } from "./modules/agents/agents.routes.js";
import { buildRecommendationsRouter } from "./modules/recommendations/recommendations.routes.js";
import { buildGovernanceRouter } from "./modules/governance/governance.routes.js";
import { buildDashboardRouter } from "./modules/dashboard/dashboard.routes.js";
import { buildUiRouter } from "./modules/ui/ui.routes.js";
import { errorHandler } from "./shared/middleware/errorHandler.js";
import { tenantMiddleware } from "./shared/middleware/tenant.js";

export function createApp(): express.Application {
  const app = express();

  app.use(express.json({ limit: "1mb" }));
  app.use(tenantMiddleware);

  // Swagger UI
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get("/api-docs.json", (_req, res) => res.json(swaggerSpec));

  // Liveness probe
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "fuzebox-ecl", version: "0.6.0" });
  });

  // UI adapter routes — mounted first so frontend GET requests get reshaped
  // responses. Non-matching methods/paths fall through to the canonical
  // module routers below.
  app.use("/api", buildUiRouter());

  // Canonical module routes
  app.use("/api/observation", buildObservationRouter());
  app.use("/api/pel", buildLedgerRouter());
  app.use("/api/agents", buildAgentsRouter());
  app.use("/api/recommendations", buildRecommendationsRouter());
  app.use("/api/governance", buildGovernanceRouter());
  app.use("/api/dashboard", buildDashboardRouter());

  app.use(errorHandler);

  return app;
}
