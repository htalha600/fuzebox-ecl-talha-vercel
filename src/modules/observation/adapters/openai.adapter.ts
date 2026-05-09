import type { BaseAdapter } from "./base.adapter.js";
import type { IngestInput } from "../observation.types.js";

interface OpenAIUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
}

interface OpenAIRaw {
  model?: string;
  usage?: OpenAIUsage;
  agent_id?: string;
  wall_ms?: number;
  vendor_cost_usd?: number;
}

export class OpenAIAdapter implements BaseAdapter {
  normalize(raw: OpenAIRaw): Partial<IngestInput> {
    return {
      hyperscaler: "openai",
      model: raw.model ?? "gpt-unknown",
      inputTokens: raw.usage?.prompt_tokens ?? 0,
      outputTokens: raw.usage?.completion_tokens ?? 0,
      wallMs: raw.wall_ms ?? 0,
      vendorCostUsd: raw.vendor_cost_usd ?? 0,
      agentId: raw.agent_id ?? "agent-openai",
      capturedVia: "litellm",
    };
  }
}
