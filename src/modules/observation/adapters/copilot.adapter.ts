import type { BaseAdapter } from "./base.adapter.js";
import type { IngestInput } from "../observation.types.js";

interface CopilotRaw {
  engine?: string;
  tokens_used?: number;
  agent_id?: string;
  duration_ms?: number;
  cost_usd?: number;
}

export class CopilotAdapter implements BaseAdapter {
  normalize(raw: CopilotRaw): Partial<IngestInput> {
    return {
      hyperscaler: "copilot",
      model: raw.engine ?? "copilot-unknown",
      inputTokens: 0,
      outputTokens: raw.tokens_used ?? 0,
      wallMs: raw.duration_ms ?? 0,
      vendorCostUsd: raw.cost_usd ?? 0,
      agentId: raw.agent_id ?? "agent-copilot",
      capturedVia: "webhook",
    };
  }
}
