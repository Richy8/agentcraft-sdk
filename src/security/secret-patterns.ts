export function defaultSecretRedactionPatterns(): RegExp[] {
  return [
    /(sk-[a-zA-Z0-9_-]{8,})/g,
    /(Bearer\s+)[a-zA-Z0-9._-]+/g,
    /(api[_-]?key["']?\s*[:=]\s*["']?)[^"',\s}]+/gi,
    /(token["']?\s*[:=]\s*["']?)[^"',\s}]+/gi,
    /(secret["']?\s*[:=]\s*["']?)[^"',\s}]+/gi,
  ];
}

export function secretDetectionPatterns(): RegExp[] {
  return [
    /sk-[a-zA-Z0-9_-]{8,}/,
    /Bearer\s+[a-zA-Z0-9._-]+/,
    /api[_-]?key\s*[:=]/i,
    /password\s*[:=]/i,
    /secret\s*[:=]/i,
  ];
}

export function isSecretLikeKey(key: string): boolean {
  return /api[_-]?key|token|secret|password|authorization/i.test(key);
}
