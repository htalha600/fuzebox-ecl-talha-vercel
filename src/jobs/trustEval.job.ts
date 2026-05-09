import { getStorage } from "../db/index.js";
import { evaluateTrustEligibility } from "../modules/governance/governance.service.js";

export async function runTrustEvalJob(tenantId: string): Promise<void> {
  const storage = getStorage();

  // Sample agents by iterating recent events and extracting unique agentIds.
  const { rows: events } = await storage.listCanonicalEvents({
    tenantId,
    limit: 200,
  });

  const agentIds = [...new Set(events.map((e) => e.agentId))];

  for (const agentId of agentIds) {
    const agent = await storage.getAgent(agentId, tenantId);
    if (!agent) continue;

    // Compute average sigma for this agent from reconciled rows.
    const agentEvents = events.filter((e) => e.agentId === agentId);
    let sigmaSum = 0;
    let sigmaCount = 0;

    for (const ev of agentEvents) {
      const ledger = await storage.getLedgerRowByEventId(ev.eventId, tenantId);
      if (ledger?.cosignStatus === "complete" && ledger.techVarianceSigma != null) {
        sigmaSum += ledger.techVarianceSigma;
        sigmaCount++;
      }
    }

    const avgSigma = sigmaCount > 0 ? sigmaSum / sigmaCount : 1;
    const { eligible, reason } = evaluateTrustEligibility(
      agent.eventCount,
      avgSigma,
      agent.trustTier,
    );

    if (eligible) {
      console.log(
        `[trustEval] agent=${agentId} tier=${agent.trustTier} eligible=true ${reason}`,
      );
    }
  }
}
