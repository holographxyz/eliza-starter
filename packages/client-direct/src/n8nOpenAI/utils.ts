export function n8nCreateLLMOverrideId({ name, agentId }: { name: string; agentId: string }): string {
  return `agent:${name}:${agentId}`;
}

export function n8nReadLLMOverrideId(id: string): { type: string; name: string; agentId: string } {
  const [type, name, agentId] = id.split(':');
  if (!type || !name || !agentId) {
    throw new Error('Invalid LLM override ID format. Expected format: agent:name:agentId');
  }
  return { type, name, agentId };
}
