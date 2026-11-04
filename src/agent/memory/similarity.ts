import type { MemoryEmbedding } from "./types.js";

export function denseEmbedding(embedding: MemoryEmbedding): readonly number[] {
  if (Array.isArray(embedding)) return embedding;
  throw new Error("AgentMemory.vector: vector stores require dense numeric embeddings");
}

export function similarity(left: MemoryEmbedding, right: MemoryEmbedding): number {
  if (isDenseEmbedding(left) && isDenseEmbedding(right)) return denseCosine(left, right);
  if (!isDenseEmbedding(left) && !isDenseEmbedding(right)) return sparseCosine(left, right);
  return 0;
}

function isDenseEmbedding(value: MemoryEmbedding): value is readonly number[] {
  return Array.isArray(value);
}

function denseCosine(left: readonly number[], right: readonly number[]): number {
  const length = Math.min(left.length, right.length);
  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;
  for (let index = 0; index < length; index++) {
    dot += (left[index] ?? 0) * (right[index] ?? 0);
    leftMagnitude += (left[index] ?? 0) ** 2;
    rightMagnitude += (right[index] ?? 0) ** 2;
  }
  if (leftMagnitude === 0 || rightMagnitude === 0) return 0;
  return dot / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}

function sparseCosine(
  left: Readonly<Record<string, number>>,
  right: Readonly<Record<string, number>>,
): number {
  const leftEntries = Object.entries(left);
  const dot = leftEntries.reduce((sum, [key, value]) => sum + value * (right[key] ?? 0), 0);
  const leftMagnitude = Math.sqrt(leftEntries.reduce((sum, [, value]) => sum + value ** 2, 0));
  const rightMagnitude = Math.sqrt(Object.values(right).reduce((sum, value) => sum + value ** 2, 0));
  if (leftMagnitude === 0 || rightMagnitude === 0) return 0;
  return dot / (leftMagnitude * rightMagnitude);
}
