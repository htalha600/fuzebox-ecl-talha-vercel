// Observation Plane capture demo.
//
// Calls a real LLM provider, captures token usage + wall time + cost,
// normalises the response through the existing adapter, and POSTs to
// /api/observation/ingest. Optionally reconciles afterwards.
//
// This simulates what a litellm-proxy / OTEL exporter / eBPF probe would
// do in production — see capturedVia in the schema.
//
// Usage:
//   npm run demo:capture -- --provider=openai    --prompt="Write a haiku about audit logs"
//   npm run demo:capture -- --provider=anthropic --prompt="Explain HMAC chaining" --reconcile
//
// Flags:
//   --provider   openai | anthropic        (required)
//   --model      provider-specific         (defaults to a cheap model)
//   --prompt     "your message"            (required)
//   --agent-id   logical agent id          (default: agent-<provider>-live)
//   --tenant     tenant id                 (default: ten_demo)
//   --base-url   ECL base URL              (default: http://localhost:3000)
//   --reconcile  flag, auto-closes the row with synthetic actuals
//
// Required env (read from .env):
//   OPENAI_API_KEY      (provider=openai)
//   ANTHROPIC_API_KEY   (provider=anthropic)

import "dotenv/config";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { OpenAIAdapter } from "../src/modules/observation/adapters/openai.adapter.js";
import { AnthropicAdapter } from "../src/modules/observation/adapters/anthropic.adapter.js";
import type { IngestInput } from "../src/modules/observation/observation.types.js";

// ---------- Pricing ($ per 1M tokens). Extend as needed. ----------
type Price = { in: number; out: number };
const PRICING: Record<string, Price> = {
  // OpenAI
  "gpt-4o-mini":   { in: 0.15,  out: 0.60  },
  "gpt-4o":        { in: 2.50,  out: 10.00 },
  "gpt-4-turbo":   { in: 10.00, out: 30.00 },
  "gpt-3.5-turbo": { in: 0.50,  out: 1.50  },
  // Anthropic
  "claude-3-5-sonnet-latest":   { in: 3.00,  out: 15.00 },
  "claude-3-5-sonnet-20241022": { in: 3.00,  out: 15.00 },
  "claude-3-5-haiku-latest":    { in: 0.80,  out: 4.00  },
  "claude-3-haiku-20240307":    { in: 0.25,  out: 1.25  },
  "claude-3-opus-20240229":     { in: 15.00, out: 75.00 },
  "claude-sonnet-4-5":          { in: 3.00,  out: 15.00 },
};

function priceUsd(model: string, inTokens: number, outTokens: number): number {
  const p = PRICING[model];
  if (!p) {
    console.warn(`[capture] no pricing entry for "${model}" — vendorCostUsd=0`);
    return 0;
  }
  return Number(((inTokens * p.in + outTokens * p.out) / 1_000_000).toFixed(8));
}

// ---------- CLI parser (no external dep) ----------
interface Args {
  provider: "openai" | "anthropic";
  model: string;
  prompt: string;
  agentId: string;
  tenant: string;
  baseUrl: string;
  reconcile: boolean;
}

function parseArgs(argv: string[]): Args {
  const map = new Map<string, string>();
  let reconcile = false;
  for (const arg of argv.slice(2)) {
    if (arg === "--reconcile") { reconcile = true; continue; }
    const m = arg.match(/^--([^=]+)=(.*)$/);
    if (m) map.set(m[1], m[2]);
  }
  const provider = (map.get("provider") ?? "").toLowerCase();
  if (provider !== "openai" && provider !== "anthropic") {
    fail(`--provider must be "openai" or "anthropic" (got "${provider}")`);
  }
  const prompt = map.get("prompt");
  if (!prompt) fail(`--prompt is required`);

  const defaultModel =
    provider === "openai" ? "gpt-4o-mini" : "claude-3-5-haiku-latest";

  return {
    provider: provider as Args["provider"],
    model: map.get("model") ?? defaultModel,
    prompt: prompt!,
    agentId: map.get("agent-id") ?? `agent-${provider}-live`,
    tenant: map.get("tenant") ?? "ten_demo",
    baseUrl: (map.get("base-url") ?? "http://localhost:3000").replace(/\/$/, ""),
    reconcile,
  };
}

function fail(msg: string): never {
  console.error(`[capture] ${msg}`);
  process.exit(2);
}

// ---------- Provider calls ----------
interface CapturedRaw {
  model: string;
  inputTokens: number;
  outputTokens: number;
  wallMs: number;
  vendorCostUsd: number;
  text: string;
}

async function callOpenAI(prompt: string, model: string): Promise<CapturedRaw> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) fail(`OPENAI_API_KEY not set in .env`);
  const client = new OpenAI({ apiKey });
  const t0 = Date.now();
  const resp = await client.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
  });
  const wallMs = Date.now() - t0;
  const inputTokens = resp.usage?.prompt_tokens ?? 0;
  const outputTokens = resp.usage?.completion_tokens ?? 0;
  return {
    model: resp.model ?? model,
    inputTokens,
    outputTokens,
    wallMs,
    vendorCostUsd: priceUsd(model, inputTokens, outputTokens),
    text: resp.choices[0]?.message?.content ?? "",
  };
}

async function callAnthropic(prompt: string, model: string): Promise<CapturedRaw> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) fail(`ANTHROPIC_API_KEY not set in .env`);
  const client = new Anthropic({ apiKey });
  const t0 = Date.now();
  const resp = await client.messages.create({
    model,
    max_tokens: 512,
    messages: [{ role: "user", content: prompt }],
  });
  const wallMs = Date.now() - t0;
  const inputTokens = resp.usage?.input_tokens ?? 0;
  const outputTokens = resp.usage?.output_tokens ?? 0;
  const text = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  return {
    model: resp.model ?? model,
    inputTokens,
    outputTokens,
    wallMs,
    vendorCostUsd: priceUsd(model, inputTokens, outputTokens),
    text,
  };
}

// ---------- Build IngestInput via existing adapter ----------
function buildIngestInput(args: Args, raw: CapturedRaw): IngestInput {
  const adapter =
    args.provider === "openai" ? new OpenAIAdapter() : new AnthropicAdapter();

  // Hand the SDK response to the existing adapter in the shape it expects.
  const adapterRaw =
    args.provider === "openai"
      ? {
          model: raw.model,
          usage: { prompt_tokens: raw.inputTokens, completion_tokens: raw.outputTokens },
          agent_id: args.agentId,
          wall_ms: raw.wallMs,
          vendor_cost_usd: raw.vendorCostUsd,
        }
      : {
          model: raw.model,
          usage: { input_tokens: raw.inputTokens, output_tokens: raw.outputTokens },
          agent_id: args.agentId,
          wall_ms: raw.wallMs,
          vendor_cost_usd: raw.vendorCostUsd,
        };

  const normalized = adapter.normalize(adapterRaw);

  // Fill in the fields the adapter doesn't set with sensible demo defaults.
  return {
    tenantId: args.tenant,
    hyperscaler: normalized.hyperscaler!,
    agentId: normalized.agentId!,
    agentName: `${args.provider} live capture`,
    model: normalized.model!,
    inputTokens: normalized.inputTokens ?? 0,
    outputTokens: normalized.outputTokens ?? 0,
    wallMs: normalized.wallMs ?? 0,
    vendorCostUsd: normalized.vendorCostUsd ?? 0,
    confidence: 0.85,
    humanBaselineMinutes: 12,
    manualHourlyCostUsd: 75,
    passedThresholds: true,
    policyId: "POL_DEFAULT_V1",
    trustTier: "T1_observed",
    capturedVia: normalized.capturedVia ?? "litellm",
    uefGsti: 0.8,
    uefTac: 0.7,
  };
}

// ---------- HTTP helpers ----------
async function postJson<T>(url: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(
      `cannot reach ${url} (${reason}). Is the backend running? Start it with \`npm run dev\` in another terminal, then retry. If it runs on a non-default port, pass --base-url=http://localhost:<port>.`,
    );
  }
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`POST ${url} → ${res.status}\n${text}`);
  }
  return JSON.parse(text) as T;
}

// ---------- Main ----------
async function main(): Promise<void> {
  const args = parseArgs(process.argv);

  console.log(`[capture] calling ${args.provider} (${args.model})…`);
  const raw =
    args.provider === "openai"
      ? await callOpenAI(args.prompt, args.model)
      : await callAnthropic(args.prompt, args.model);

  console.log(
    `[capture] tokens in=${raw.inputTokens} out=${raw.outputTokens} wallMs=${raw.wallMs} cost=$${raw.vendorCostUsd.toFixed(8)}`,
  );
  if (raw.text) {
    const preview = raw.text.replace(/\s+/g, " ").slice(0, 120);
    console.log(`[capture] response: "${preview}${raw.text.length > 120 ? "…" : ""}"`);
  }

  const ingestBody = buildIngestInput(args, raw);
  const ingest = await postJson<{
    eventId: string;
    ledgerRowId: string;
    auditHash: string;
    cosignStatus: string;
  }>(`${args.baseUrl}/api/observation/ingest`, ingestBody);

  console.log(
    `[capture] ingested → eventId=${ingest.eventId} cosign=${ingest.cosignStatus} auditHash=${ingest.auditHash.slice(0, 16)}…`,
  );

  if (args.reconcile) {
    // Pretend the SoR confirmed the actual cost matched ±5% and labor saved
    // landed at 1.0× predicted.
    const drift = 0.95 + Math.random() * 0.1;
    const actualCostUsd = Number((raw.vendorCostUsd * 1.15 * drift).toFixed(8)); // amortised ≈ vendor × 1.15
    const laborSavedUsd = Number(((12 / 60) * 75).toFixed(6));
    const reconBody = {
      tenantId: args.tenant,
      eventId: ingest.eventId,
      actualCostUsd,
      actualOutcomeUsd: laborSavedUsd,
      actualSourceSor: "live-capture-demo",
    };
    const recon = await postJson<{
      cosignStatus: string;
      attributionBucket: string;
      techVarianceSigma: number;
    }>(`${args.baseUrl}/api/pel/reconcile`, reconBody);
    console.log(
      `[capture] reconciled → cosign=${recon.cosignStatus} attribution=${recon.attributionBucket} sigma=${recon.techVarianceSigma}`,
    );
  }
}

main().catch((err) => {
  if (err instanceof Error) console.error(`[capture] FAILED: ${err.message}`);
  else console.error(`[capture] FAILED:`, err);
  process.exit(1);
});
