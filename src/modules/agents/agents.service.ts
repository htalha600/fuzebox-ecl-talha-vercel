import type { IStorage } from "../../db/index.js";
import type { Agent, AgentInsert } from "../../../shared/schema.js";
import { HttpError } from "../../shared/errors.js";

export async function getAgent(
  storage: IStorage,
  agentId: string,
  tenantId: string,
): Promise<Agent> {
  const agent = await storage.getAgent(agentId, tenantId);
  if (!agent) {
    throw new HttpError(404, `agent ${agentId} not found`);
  }
  return agent;
}

export async function registerAgent(
  storage: IStorage,
  input: AgentInsert,
): Promise<Agent> {
  return storage.upsertAgent(input);
}

export async function listAgents(
  storage: IStorage,
  tenantId: string,
  limit?: number,
  offset?: number,
): Promise<{ rows: Agent[]; total: number }> {
  return storage.listAgents({ tenantId, limit, offset });
}
