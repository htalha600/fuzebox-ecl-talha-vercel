import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { HttpError } from "../errors.js";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    res.status(400).json({ error: "ValidationError", issues: err.issues });
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.name, message: err.message });
    return;
  }
  console.error("[unhandled]", err);
  res.status(500).json({
    error: "InternalServerError",
    message: err instanceof Error ? err.message : "unknown error",
  });
}
