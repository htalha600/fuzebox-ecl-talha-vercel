import { env } from "./config/env.js";
import { getDb } from "./db/index.js";
import { createApp } from "./app.js";

// Bootstrap DB before first request.
getDb();

const app = createApp();

async function start() {
  if (process.env.NODE_ENV === "production") {
    const { serveStatic } = await import("./vite.js");
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite.js");
    await setupVite(app);
  }

  app.listen(env.PORT, () => {
    console.log(`[fuzebox-ecl] listening on http://localhost:${env.PORT}`);
    console.log(`[fuzebox-ecl] Swagger UI at http://localhost:${env.PORT}/api-docs`);
    console.log(`[fuzebox-ecl] Frontend at http://localhost:${env.PORT}/`);
  });
}

start().catch((err) => {
  console.error("[fuzebox-ecl] failed to start:", err);
  process.exit(1);
});
