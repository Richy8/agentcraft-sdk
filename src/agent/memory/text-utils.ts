export function tokenize(text: string): string[] {
  return text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
}

export function truncate(value: string, maxChars: number): string {
  return value.length > maxChars ? `${value.slice(0, Math.max(0, maxChars - 1))}…` : value;
}

export function compactPreview(value: string, maxChars = 220): string {
  return truncate(value.replace(/\s+/g, ' ').trim(), maxChars);
}

export function containsSensitiveMaterial(value: string): boolean {
  return /(?:sk-[a-zA-Z0-9_-]{16,}|api[_-]?key|secret|password|ssn|social security|\b\d{3}-\d{2}-\d{4}\b)/i.test(
    value
  );
}
