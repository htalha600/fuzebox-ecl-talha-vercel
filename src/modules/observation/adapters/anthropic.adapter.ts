import type { BaseAdapter } from "./base.adapter.js";
import type { IngestInput } from "../observation.types.js";

interface AnthropicUsage {
  input_tokens?: number;
  output_tokens?: number;
}

interface AnthropicRaw {
  model?: string;
  usage?: AnthropicUsage;
  agent_id?: string;
  wall_ms?: number;
  vendor_cost_usd?: number;
}

export class AnthropicAdapter implements BaseAdapter {
  normalize(raw: AnthropicRaw): Partial<IngestInput> {
    return {
      hyperscaler: "anthropic",
      model: raw.model ?? "claude-unknown",
      inputTokens: raw.usage?.input_tokens ?? 0,
      outputTokens: raw.usage?.output_tokens ?? 0,
      wallMs: raw.wall_ms ?? 0,
      vendorCostUsd: raw.vendor_cost_usd ?? 0,
      agentId: raw.agent_id ?? "agent-anthropic",
      capturedVia: "litellm",
    };
  }
}
