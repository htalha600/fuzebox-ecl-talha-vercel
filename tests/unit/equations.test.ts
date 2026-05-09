import {
  computeCUoW,
  computeMER,
  computeCTR,
  computeTV,
  computeRoP,
  computeTUoP,
} from "../../src/modules/equations/equations.service.js";

function assert(condition: boolean, msg: string): void {
  if (!condition) throw new Error(`FAIL: ${msg}`);
}

function near(a: number, b: number, tol = 0.0001): boolean {
  return Math.abs(a - b) < tol;
}

function testCUoW(): void {
  assert(computeCUoW({ amortizedCostUsd: 0.01, outputTokens: 200 }) === 0.00005, "CUoW");
  assert(computeCUoW({ amortizedCostUsd: 0.01, outputTokens: 0 }) === 0, "CUoW zero tokens");
}

function testMER(): void {
  const mer = computeMER({ laborValueSavedUsd: 10, amortizedCostUsd: 2 });
  assert(mer === 5, "MER should be 5");
  assert(computeMER({ laborValueSavedUsd: 10, amortizedCostUsd: 0 }) === 0, "MER zero cost");
}

function testCTR(): void {
  const ctr = computeCTR({ amortizedCostUsd: 1, revenueAttributedUsd: 10 });
  assert(near(ctr, 0.1), "CTR should be 0.1");
}

function testTV(): void {
  const tv = computeTV({ actualCostUsd: 1.5, predictedCostUsd: 1 });
  assert(near(tv, 0.5), "TV should be 0.5");
  assert(computeTV({ actualCostUsd: 1, predictedCostUsd: 0 }) === 0, "TV zero predicted");
}

function testRoP(): void {
  const rop = computeRoP({ laborValueSavedUsd: 8, predictedCostUsd: 2 });
  assert(rop === 4, "RoP should be 4");
}

function testTUoP(): void {
  const tuop = computeTUoP({ eventCount: 100, trustTier: "T2_supervised" });
  assert(near(tuop, 60), "TUoP T2 = 100 * 0.6 = 60");
  const tuop2 = computeTUoP({ eventCount: 100, trustTier: "T4_autonomous" });
  assert(near(tuop2, 100), "TUoP T4 = 100 * 1.0 = 100");
}

testCUoW();
testMER();
testCTR();
testTV();
testRoP();
testTUoP();
console.log("equations.test.ts: all assertions passed");
