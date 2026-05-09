import type { Request, Response, NextFunction } from "express";
import { env } from "../../config/env.js";

declare global {
  namespace Express {
    interface Request {
      tenantId: string;
    }
  }
}

export function tenantMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  req.tenantId =
    (req.headers["x-tenant-id"] as string | undefined) ??
    (req.query["tenantId"] as string | undefined) ??
    env.DEFAULT_TENANT_ID;
  next();
}
