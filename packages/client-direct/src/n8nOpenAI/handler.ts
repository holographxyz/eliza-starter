import {
  AgentRuntime,
  stringToUuid,
  Content,
  Memory,
  getEmbeddingZeroVector,
  composeContext,
  generateMessageResponse,
  ModelClass,
} from '@elizaos/core';
import { messageHandlerTemplate } from '../index';

export async function handleAgentMessage(this: { agents: Map<string, AgentRuntime> }, agentId: string, text: string) {
  let runtime = this.agents.get(agentId);

  // if runtime is null, look for runtime with the same name
  if (!runtime) {
    runtime = Array.from(this.agents.values()).find(a => a.character.name.toLowerCase() === agentId.toLowerCase());
  }

  if (!runtime) {
    throw new Error('Agent not found');
  }

  if (!text) {
    return [];
  }

  const userId = stringToUuid('user');
  const roomId = stringToUuid('default-room-' + agentId);
  const messageId = stringToUuid(Date.now().toString());

  await runtime.ensureConnection(userId, roomId, 'user', 'User', 'direct');

  const content: Content = {
    text,
    attachments: [],
    source: 'direct',
    inReplyTo: undefined,
  };

  const userMessage = {
    content,
    userId,
    roomId,
    agentId: runtime.agentId,
  };

  const memory: Memory = {
    id: stringToUuid(messageId + '-' + userId),
    ...userMessage,
    agentId: runtime.agentId,
    userId,
    roomId,
    content,
    createdAt: Date.now(),
  };

  await runtime.messageManager.addEmbeddingToMemory(memory);
  await runtime.messageManager.createMemory(memory);

  let state = await runtime.composeState(userMessage, {
    agentName: runtime.character.name,
  });

  const context = composeContext({
    state,
    template: messageHandlerTemplate,
  });

  const response = await generateMessageResponse({
    runtime: runtime,
    context,
    modelClass: ModelClass.LARGE,
  });

  if (!response) {
    throw new Error('No response from generateMessageResponse');
  }

  // save response to memory
  const responseMessage: Memory = {
    id: stringToUuid(messageId + '-' + runtime.agentId),
    ...userMessage,
    userId: runtime.agentId,
    content: response,
    embedding: getEmbeddingZeroVector(),
    createdAt: Date.now(),
  };

  await runtime.messageManager.createMemory(responseMessage);
  state = await runtime.updateRecentMessageState(state);
  let message = null as Content | null;

  await runtime.processActions(memory, [responseMessage], state, async newMessages => {
    message = newMessages;
    return [memory];
  });

  await runtime.evaluate(memory, state);

  // Check if we should suppress the initial message
  const action = runtime.actions.find(a => a.name === response.action);
  const shouldSuppressInitialMessage = action?.suppressInitialMessage;

  if (!shouldSuppressInitialMessage) {
    if (message) {
      return [response, message];
    } else {
      return [response];
    }
  } else {
    if (message) {
      return [message];
    } else {
      return [];
    }
  }
}
