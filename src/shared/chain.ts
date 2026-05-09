import { createHmac } from "node:crypto";
import { GENESIS_HASH } from "../config/constants.js";
import type { CanonicalEvent } from "../../shared/schema.js";

export function computeHash(secret: string, ...parts: string[]): string {
  const h = createHmac("sha256", secret);
  for (const p of parts) h.update(p);
  return h.digest("hex");
}

export function canonicalize(obj: Record<string, unknown>): string {
  const keys = Object.keys(obj).sort();
  const ordered: Record<string, unknown> = {};
  for (const k of keys) ordered[k] = obj[k];
  return JSON.stringify(ordered);
}

export function getPrevHash(prev: CanonicalEvent | undefined): string {
  return prev?.auditHash ?? GENESIS_HASH;
}

export function verifyChain(
  events: CanonicalEvent[],
): { valid: boolean; brokenAt?: string } {
  const sorted = [...events].sort((a, b) => {
    const aMs =
      a.createdAt instanceof Date ? a.createdAt.getTime() : Number(a.createdAt);
    const bMs =
      b.createdAt instanceof Date ? b.createdAt.getTime() : Number(b.createdAt);
    return aMs - bMs;
  });

  for (let i = 0; i < sorted.length; i++) {
    const ev = sorted[i];
    const expectedPrev =
      i === 0 ? GENESIS_HASH : sorted[i - 1].auditHash;
    if (ev.prevEventHash !== expectedPrev) {
      return { valid: false, brokenAt: ev.eventId };
    }
  }
  return { valid: true };
}
