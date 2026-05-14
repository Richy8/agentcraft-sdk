const CONFIG_PATTERN = /\{\{\s*config\.([^}]+?)\s*\}\}/g;

export interface InjectionResult {
  content: string;
  count: number;
}

export function injectConfig(
  content: string,
  config: Record<string, unknown> = {}
): InjectionResult {
  let count = 0;
  const next = content.replace(CONFIG_PATTERN, (match, path: string) => {
    const value = getByPath(config, path.trim());
    if (value === undefined) return match;
    count++;
    return formatValue(value);
  });

  return { content: next, count };
}

function getByPath(source: Record<string, unknown>, keyPath: string): unknown {
  return keyPath.split('.').reduce<unknown>((current, key) => {
    if (current && typeof current === 'object' && key in current) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, source);
}

function formatValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value === null || typeof value !== 'object') return String(value);
  return JSON.stringify(value);
}
