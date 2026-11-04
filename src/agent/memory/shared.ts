export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function safePathSegment(value: string): string {
  if (!/^[a-zA-Z0-9_.-]+$/.test(value)) {
    throw new Error(`AgentMemory: invalid id or scope '${value}'`);
  }
  return value;
}

export function clampPositiveInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.floor(value)));
}

export function requiredUrl(options: { readonly url?: string }, provider: string): string {
  if (!options.url) {
    throw new Error(`AgentMemory.vector: ${provider} url is required when no client is provided`);
  }
  return options.url.replace(/\/$/, "");
}

export function redactedVectorConnection(options: { readonly url?: string }): string | undefined {
  return options.url ? redactUrl(options.url) : undefined;
}

export function redactUrl(value: string): string {
  try {
    const url = new URL(value);
    if (url.username) url.username = "[REDACTED]";
    if (url.password) url.password = "[REDACTED]";
    for (const key of [...url.searchParams.keys()]) {
      if (/key|token|secret|password|signature/i.test(key)) {
        url.searchParams.set(key, "[REDACTED]");
      }
    }
    return url.toString();
  } catch {
    return value;
  }
}
