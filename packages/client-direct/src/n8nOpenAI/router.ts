import express from 'express';
import { AgentRuntime, elizaLogger } from '@elizaos/core';
import { DirectClient } from '..';
import { handleAgentMessage } from './handler';
import { OpenAIChatCompletionRequest, OpenAIChatCompletionResponse } from './types';
import { n8nCreateLLMOverrideId, n8nReadLLMOverrideId } from './utils';

export const createN8nOpenAIRouter = (
  agents: Map<string, AgentRuntime>,
  directClient: DirectClient,
): express.Router => {
  const router = express.Router();

  // OpenAI API v1 chat completions endpoint
  router.post('/v1/chat/completions', async (req, res) => {
    try {
      const body = req.body as OpenAIChatCompletionRequest;
      if (!body.model) {
        return res.status(400).json({
          error: {
            message: 'Model ID is required',
            type: 'invalid_request_error',
            code: 'model_required',
          },
        });
      }

      // Parse the model string to get the agent ID
      let modelParts;
      try {
        modelParts = n8nReadLLMOverrideId(body.model);
      } catch (error) {
        return res.status(400).json({
          error: {
            message: 'Invalid model ID format',
            type: 'invalid_request_error',
            code: 'invalid_model',
          },
        });
      }

      // Find the agent with the matching ID
      const agent = agents.get(modelParts.agentId);
      if (!agent) {
        return res.status(404).json({
          error: {
            message: 'Model not found',
            type: 'invalid_request_error',
            code: 'model_not_found',
          },
        });
      }

      // Convert OpenAI messages format to Eliza format
      const messages = body.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await handleAgentMessage.call(
        directClient,
        modelParts.agentId,
        messages[messages.length - 1].content,
      );

      // Format response in OpenAI style
      const completion: OpenAIChatCompletionResponse = {
        id: `chatcmpl-${Date.now()}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: body.model,
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: response[0].text,
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 0, // You may want to implement proper token counting
          completion_tokens: 0,
          total_tokens: 0,
        },
      };

      res.json(completion);
    } catch (error) {
      elizaLogger.error('Error in chat completions endpoint:', error);
      res.status(500).json({
        error: {
          message: 'Internal server error',
          type: 'server_error',
          code: 'internal_error',
        },
      });
    }
  });

  // Models endpoint
  router.get('/v1/models', async (req, res) => {
    try {
      const agentsList = Array.from(agents.values()).map(agent => ({
        id: n8nCreateLLMOverrideId({ name: agent.character.name, agentId: agent.agentId }),
        object: 'model',
        created: Math.floor(Date.now() / 1000),
        owned_by: 'eliza',
      }));
      res.json({
        data: agentsList,
        object: 'list',
      });
    } catch (error) {
      elizaLogger.error('Error in models endpoint:', error);
      res.status(500).json({
        error: {
          message: 'Internal server error',
          type: 'server_error',
          code: 'internal_error',
        },
      });
    }
  });

  return router;
};
