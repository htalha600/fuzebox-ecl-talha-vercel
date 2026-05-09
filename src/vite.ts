import express, {
  type Application,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

export async function setupVite(app: Application): Promise<void> {
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    configFile: path.resolve(repoRoot, "vite.config.ts"),
    server: { middlewareMode: true },
    appType: "custom",
  });

  app.use(vite.middlewares);

  app.use("*", async (req: Request, res: Response, next: NextFunction) => {
    const url = req.originalUrl;
    if (url.startsWith("/api") || url.startsWith("/api-docs") || url === "/health") {
      return next();
    }
    try {
      const indexPath = path.resolve(repoRoot, "frontend/index.html");
      let template = fs.readFileSync(indexPath, "utf-8");
      template = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(template);
    } catch (err) {
      vite.ssrFixStacktrace(err as Error);
      next(err);
    }
  });
}

export function serveStatic(app: Application): void {
  const distDir = path.resolve(repoRoot, "dist/public");
  if (!fs.existsSync(distDir)) {
    throw new Error(
      `Build directory not found: ${distDir}. Run \`npm run build:client\` first.`,
    );
  }
  app.use(express.static(distDir));
  app.use("*", (req: Request, res: Response, next: NextFunction) => {
    const url = req.originalUrl;
    if (url.startsWith("/api") || url.startsWith("/api-docs") || url === "/health") {
      return next();
    }
    res.sendFile(path.resolve(distDir, "index.html"));
  });
}
