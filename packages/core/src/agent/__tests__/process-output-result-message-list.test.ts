import { convertArrayToReadableStream, MockLanguageModelV2 } from '@internal/ai-sdk-v5/test';
import { EventEmitterPubSub } from '../../events';
import { Mastra } from '../../mastra';
import { MockMemory } from '../../memory/mock';
import { InMemoryStore } from '../../storage';
import { describe, expect, it } from 'vitest';
import type { Processor } from '../../processors';
import { createTool } from '../../tools';
import { Agent } from '../agent';
import { z } from 'zod/v4';

describe('processOutputResult message tracking', () => {
  it('passes response messages saved during a streamed tool call', async () => {
    let modelCallCount = 0;
    const observations: Array<{
      argumentMessages: string[];
      allMessages: string[];
      unsavedResponseMessages: string[];
      persistedResponseMessages: string[];
    }> = [];

    const model = new MockLanguageModelV2({
      doStream: async () => {
        modelCallCount += 1;

        const streamParts =
          modelCallCount === 1
            ? [
                { type: 'stream-start' as const, warnings: [] },
                { type: 'response-metadata' as const, id: 'response-1', modelId: 'mock-model-id', timestamp: new Date(0) },
                {
                  type: 'tool-call' as const,
                  toolCallId: 'tool-call-1',
                  toolName: 'read_workspace',
                  input: '{"path":"README.md"}',
                },
                {
                  type: 'finish' as const,
                  finishReason: 'tool-calls' as const,
                  usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
                },
              ]
            : [
                { type: 'stream-start' as const, warnings: [] },
                { type: 'response-metadata' as const, id: 'response-2', modelId: 'mock-model-id', timestamp: new Date(0) },
                { type: 'text-start' as const, id: 'text-1' },
                { type: 'text-delta' as const, id: 'text-1', delta: 'README.md is ready.' },
                { type: 'text-end' as const, id: 'text-1' },
                {
                  type: 'finish' as const,
                  finishReason: 'stop' as const,
                  usage: { inputTokens: 20, outputTokens: 5, totalTokens: 25 },
                },
              ];

        return {
          stream: convertArrayToReadableStream(streamParts),
          rawCall: { rawPrompt: [], rawSettings: {} },
          warnings: [],
        };
      },
    });

    const processor: Processor = {
      id: 'message-tracker',
      name: 'Message Tracker',
      async processOutputResult({ messages, messageList }) {
        observations.push({
          argumentMessages: messages.map(message => message.id),
          allMessages: messageList.get.all.db().map(message => message.id),
          unsavedResponseMessages: messageList.get.response.db().map(message => message.id),
          persistedResponseMessages: messageList.getPersisted.response.db().map(message => message.id),
        });
        return messages;
      },
    };

    const agent = new Agent({
      id: 'process-output-result-agent',
      name: 'Process Output Result Agent',
      instructions: 'Use the tool before answering.',
      model,
      memory: new MockMemory(),
      tools: {
        read_workspace: createTool({
          id: 'read_workspace',
          description: 'Read a workspace file.',
          inputSchema: z.object({ path: z.string() }),
          execute: async () => ({ contents: 'README.md contents' }),
        }),
      },
      outputProcessors: [processor],
    });

    const mastra = new Mastra({
      agents: { processOutputResultAgent: agent },
      logger: false,
      storage: new InMemoryStore(),
      pubsub: new EventEmitterPubSub(),
    });

    await mastra.startWorkers();
    try {
      const stream = await mastra.getAgent('processOutputResultAgent').stream('Read README.md', {
        memory: { thread: 'thread-1', resource: 'resource-1' },
        savePerStep: true,
      });
      for await (const _chunk of stream.fullStream) {
        // Consume the same evented stream returned by the HTTP agent route.
      }
    } finally {
      await mastra.stopWorkers();
    }

    const finalObservation = observations.at(-1);
    expect(modelCallCount).toBe(2);
    expect(finalObservation).toBeDefined();
    expect(finalObservation?.argumentMessages.length).toBeGreaterThan(0);
    expect(finalObservation?.allMessages).toEqual(expect.arrayContaining(finalObservation?.argumentMessages ?? []));
    expect(finalObservation?.unsavedResponseMessages).toEqual([]);
    expect(finalObservation?.persistedResponseMessages).toEqual(finalObservation?.argumentMessages);
  });
});
