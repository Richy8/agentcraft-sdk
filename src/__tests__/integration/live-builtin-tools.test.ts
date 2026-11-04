/**
 * Live BuiltInTools integration tests.
 *
 * Covers:
 *   A. BuiltInTools.webSearch() — attaches as native-provider adapter, capabilities visible via inspect()
 *   B. BuiltInTools.webSearch() — live web search via OpenAI Responses API
 *   C. BuiltInTools.webSearch() — throws UnsupportedCapabilityError on non-supporting provider
 *   D. BuiltInTools.fileSearch() — attaches as native-provider adapter with vector store config
 *
 * Run with:
 *   INTEGRATION_TESTS=true AGENTCRAFT_LIVE_BUILTIN_TOOLS=true \
 *   AGENTCRAFT_LIVE_PROVIDERS=openai \
 *   npm run test:int -- src/__tests__/integration/live-builtin-tools.test.ts
 */

import { describe, expect, it } from 'vitest';
import { Agent } from '../../agent/agent.js';
import { BuiltInTools } from '../../agent/built-in-tools.js';
import { UnsupportedCapabilityError } from '../../errors/index.js';

const integrationEnabled = process.env.INTEGRATION_TESTS === 'true';
const builtinToolsEnabled = process.env.AGENTCRAFT_LIVE_BUILTIN_TOOLS === 'true';
const openAiKey = process.env.OPENAI_API_KEY;
const anthropicKey = process.env.ANTHROPIC_API_KEY;
const openAiEnabled = parseProviderSelection(process.env.AGENTCRAFT_LIVE_PROVIDERS).has('openai');
const liveIt = integrationEnabled && builtinToolsEnabled && openAiEnabled && openAiKey ? it : it.skip;
const liveModel = process.env.AGENTCRAFT_LIVE_OPENAI_MODEL ?? 'gpt-4o-mini';
const maxTokens = Number.parseInt(process.env.AGENTCRAFT_LIVE_BUILTIN_MAX_TOKENS ?? '256', 10);

describe('live BuiltInTools smoke tests', () => {
  // ---------------------------------------------------------------------------
  // A. Adapter metadata — webSearch() produces a native-provider adapter
  // ---------------------------------------------------------------------------
  liveIt(
    'BuiltInTools.webSearch() creates an adapter with native-provider kind',
    async () => {
      const adapter = BuiltInTools.webSearch({ contextSize: 'low' });

      expect(adapter.metadata?.kind).toBe('native-provider');
      expect(adapter.metadata?.nativeToolType).toBe('web_search');

      const tools = await adapter.getTools?.();
      expect(tools?.length).toBeGreaterThanOrEqual(1);
      const webTool = tools?.find((t) => t.nativeSpec?.type === 'web_search');
      expect(webTool).toBeTruthy();
      expect(webTool?.nativeSpec?.type).toBe('web_search');
    },
    15_000,
  );

  // ---------------------------------------------------------------------------
  // B. webSearch() attached to agent — run completes without error
  //
  // NOTE: Actual web search execution requires the OpenAI Responses API endpoint
  // (not chat completions). Via standard chat completions the native tool is
  // forwarded as a tool definition but the model cannot invoke it. This test
  // verifies the adapter attaches cleanly and the run does not throw.
  // ---------------------------------------------------------------------------
  liveIt(
    'BuiltInTools.webSearch() attaches to agent and run completes without error',
    async () => {
      const agent = Agent.create({
        model: `openai:${liveModel}`,
        apiKey: openAiKey!,
        temperature: 0,
        maxTokens,
        retry: { maxAttempts: 1, backoff: 'fixed', initialDelay: 100, maxDelay: 100 },
      }).use(BuiltInTools.webSearch({ contextSize: 'low' }));

      // Should not throw — the native tool adapter wires up correctly even on
      // the chat completions endpoint (model will respond without web search).
      const response = await agent.run({
        prompt: 'Reply with: web-search-adapter-ok',
        temperature: 0,
        maxTokens: 48,
      });

      expect(response.content.length).toBeGreaterThan(0);
      expect(response.provider).toBe('openai');
    },
    60_000,
  );

  // ---------------------------------------------------------------------------
  // C. UnsupportedCapabilityError on a model that does not support native webSearch
  // ---------------------------------------------------------------------------
  it(
    'BuiltInTools.webSearch() throws UnsupportedCapabilityError on Anthropic (standard API)',
    async () => {
      if (!integrationEnabled || !builtinToolsEnabled || !anthropicKey) return;

      const agent = Agent.create({
        model: 'anthropic:claude-haiku-4-5-20251001',
        apiKey: anthropicKey,
        temperature: 0,
        maxTokens: 64,
        retry: { maxAttempts: 1, backoff: 'fixed', initialDelay: 100, maxDelay: 100 },
      }).use(BuiltInTools.webSearch());

      await expect(
        agent.run({ prompt: 'What is today\'s date?', temperature: 0, maxTokens: 64 }),
      ).rejects.toThrow(UnsupportedCapabilityError);
    },
    15_000,
  );

  // ---------------------------------------------------------------------------
  // D. BuiltInTools.fileSearch() adapter shape validation
  // ---------------------------------------------------------------------------
  liveIt(
    'BuiltInTools.fileSearch() creates an adapter with correct native-provider metadata',
    async () => {
      const vectorStoreId = process.env.AGENTCRAFT_LIVE_VECTOR_STORE_ID ?? 'vs_test_placeholder';
      const adapter = BuiltInTools.fileSearch({ vectorStoreId, maxResults: 5 });

      expect(adapter.metadata?.kind).toBe('native-provider');
      expect(adapter.metadata?.nativeToolType).toBe('file_search');

      const tools = await adapter.getTools?.();
      expect(tools?.length).toBeGreaterThanOrEqual(1);
      const fileTool = tools?.find((t) => t.nativeSpec?.type === 'file_search');
      expect(fileTool?.nativeSpec?.type).toBe('file_search');
      expect((fileTool?.nativeSpec as { vector_store_ids?: string[] })?.vector_store_ids).toContain(vectorStoreId);
    },
    15_000,
  );
});

function parseProviderSelection(value: string | undefined): Set<string> {
  if (!value || value.trim() === '') return new Set(['openai']);
  const selected = value.split(',').map((p) => p.trim().toLowerCase()).filter(Boolean);
  return selected.includes('all') ? new Set(['openai']) : new Set(selected);
}
