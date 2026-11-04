import type {
  CustomEmbeddingOptions,
  EmbeddingProvider,
  OpenAIEmbeddingOptions,
} from './types.js';
import { tokenize } from './text-utils.js';

export function lexicalEmbeddingProvider(): EmbeddingProvider {
  return {
    name: 'lexical',
    model: 'agentcraft-lexical-v1',
    async embed(text: string): Promise<Readonly<Record<string, number>>> {
      const vector: Record<string, number> = {};
      for (const token of tokenize(text)) vector[token] = (vector[token] ?? 0) + 1;
      return vector;
    },
  };
}

export function openAIEmbeddingProvider(options: OpenAIEmbeddingOptions = {}): EmbeddingProvider {
  const model = options.model ?? 'text-embedding-3-small';
  return {
    name: 'openai',
    model,
    async embed(text: string): Promise<readonly number[]> {
      const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
      if (!apiKey) throw new Error('AgentMemory.embeddings.openAI: apiKey is required');
      const response = await fetch(`${options.baseUrl ?? 'https://api.openai.com/v1'}/embeddings`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model,
          input: text,
          ...(options.dimensions !== undefined && { dimensions: options.dimensions }),
        }),
      });
      if (!response.ok) {
        throw new Error(`AgentMemory.embeddings.openAI: embedding request failed (${response.status})`);
      }
      const json = (await response.json()) as {
        data?: Array<{ embedding?: number[] }>;
      };
      const embedding = json.data?.[0]?.embedding;
      if (!embedding) throw new Error('AgentMemory.embeddings.openAI: response did not include an embedding');
      return embedding;
    },
  };
}

export function customEmbeddingProvider(options: CustomEmbeddingOptions): EmbeddingProvider {
  return {
    name: options.name ?? 'custom',
    ...(options.model !== undefined && { model: options.model }),
    embed: async (text) => await options.embed(text),
  };
}
