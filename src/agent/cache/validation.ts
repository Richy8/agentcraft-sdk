export function assertJsonSerializable(value: unknown, label: string): string {
  const seen = new WeakSet<object>();
  validateJsonValue(value, label, seen);
  const serialized = JSON.stringify(value);
  if (serialized === undefined) {
    throw new Error(`${label} must be JSON-serializable.`);
  }
  return serialized;
}

function validateJsonValue(
  value: unknown,
  label: string,
  seen: WeakSet<object>,
): void {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    if (typeof value === "number" && !Number.isFinite(value)) {
      throw new Error(`${label} contains a non-finite number.`);
    }
    return;
  }
  if (typeof value === "bigint") {
    throw new Error(`${label} contains a bigint value.`);
  }
  if (typeof value === "function" || typeof value === "symbol") {
    throw new Error(
      `${label} must be JSON-serializable; found a non-serializable ${typeof value}.`,
    );
  }
  if (value === undefined) {
    throw new Error(`${label} contains undefined.`);
  }
  if (typeof value !== "object") return;
  if (seen.has(value)) throw new Error(`${label} contains a circular value.`);
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      validateJsonValue(item, `${label}[${index}]`, seen),
    );
    seen.delete(value);
    return;
  }
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    validateJsonValue(item, `${label}.${key}`, seen);
  }
  seen.delete(value);
}
