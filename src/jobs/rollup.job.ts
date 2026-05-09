import { getStorage } from "../db/index.js";
import {
  computeMER,
  computeTV,
  computeRoP,
} from "../modules/equations/equations.service.js";

export async function runRollupJob(tenantId: string): Promise<void> {
  const storage = getStorage();
  const { rows: events } = await storage.listCanonicalEvents({
    tenantId,
    limit: 500,
  });

  let totalMER = 0;
  let totalTV = 0;
  let totalRoP = 0;
  let reconciledCount = 0;

  for (const event of events) {
    const ledger = await storage.getLedgerRowByEventId(event.eventId, tenantId);
    if (!ledger || ledger.cosignStatus !== "complete") continue;

    reconciledCount++;
    totalMER += computeMER({
      laborValueSavedUsd: event.laborValueSavedUsd,
      amortizedCostUsd: event.amortizedCostUsd,
    });
    totalTV += computeTV({
      actualCostUsd: ledger.actualCostUsd ?? 0,
      predictedCostUsd: ledger.predictedCostUsd,
    });
    totalRoP += computeRoP({
      laborValueSavedUsd: event.laborValueSavedUsd,
      predictedCostUsd: ledger.predictedCostUsd,
    });
  }

  if (reconciledCount === 0) return;

  console.log(`[rollup] tenant=${tenantId} events=${reconciledCount}`, {
    avgMER: (totalMER / reconciledCount).toFixed(4),
    avgTV: (totalTV / reconciledCount).toFixed(4),
    avgRoP: (totalRoP / reconciledCount).toFixed(4),
  });
}
