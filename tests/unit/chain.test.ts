import { computeHash, canonicalize, verifyChain } from "../../src/shared/chain.js";

// Minimal test stubs — fill with a test runner (vitest/jest) as needed.

function assert(condition: boolean, msg: string): void {
  if (!condition) throw new Error(`FAIL: ${msg}`);
}

function testComputeHash(): void {
  const h = computeHash("secret", "part1", "part2");
  assert(typeof h === "string" && h.length === 64, "HMAC should be 64-char hex");
  const h2 = computeHash("secret", "part1", "part2");
  assert(h === h2, "HMAC should be deterministic");
  const h3 = computeHash("secret", "part1", "DIFFERENT");
  assert(h !== h3, "Different input should produce different hash");
}

function testCanonicalize(): void {
  const a = canonicalize({ b: 2, a: 1, c: 3 });
  const b = canonicalize({ c: 3, a: 1, b: 2 });
  assert(a === b, "canonicalize should sort keys");
  assert(a === '{"a":1,"b":2,"c":3}', "canonicalize output format");
}

function testVerifyChain(): void {
  const events = [
    { eventId: "e1", auditHash: "h1", prevEventHash: "GENESIS" },
    { eventId: "e2", auditHash: "h2", prevEventHash: "h1" },
    { eventId: "e3", auditHash: "h3", prevEventHash: "h2" },
  ] as Parameters<typeof verifyChain>[0];

  const result = verifyChain(events);
  assert(result.valid, "valid chain should pass");

  const broken = [...events];
  broken[1] = { ...broken[1], prevEventHash: "WRONG" };
  const result2 = verifyChain(broken);
  assert(!result2.valid, "broken chain should fail");
  assert(result2.brokenAt === "e2", "brokenAt should point to e2");
}

testComputeHash();
testCanonicalize();
testVerifyChain();
console.log("chain.test.ts: all assertions passed");
