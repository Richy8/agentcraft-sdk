import { ToolExecutionError } from '../errors/index.js';

export type JsonSchema = {
  type?: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  enum?: unknown[];
};

export type ZodLikeSchema<T = unknown> = {
  safeParse(value: unknown): { success: true; data: T } | { success: false; error: { message?: string } };
};

export type StructuredOutputSchema<T = unknown> = JsonSchema | ZodLikeSchema<T>;

export interface StructuredOutputOptions {
  retries?: number;
  toolFallback?: boolean | 'auto';
}

export interface StructuredOutputResult {
  value: unknown;
  attempts: number;
}

export function parseAndValidateStructuredOutput(content: string, schema: StructuredOutputSchema): StructuredOutputResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    throw new ToolExecutionError(`Structured output was not valid JSON: ${(error as Error).message}`);
  }

  if (isZodLike(schema)) {
    const result = schema.safeParse(parsed);
    if (!result.success) throw new ToolExecutionError(`Structured output failed schema validation: ${result.error.message ?? 'invalid value'}`);
    return { value: result.data, attempts: 1 };
  }

  validateJsonSchema(parsed, schema, '$');
  return { value: parsed, attempts: 1 };
}

export function structuredOutputInstruction(schema: StructuredOutputSchema): string {
  return [
    'Return only valid JSON that conforms to the requested response schema.',
    'Do not include markdown fences, commentary, or extra prose outside the JSON value.',
    !isZodLike(schema) ? `JSON Schema: ${JSON.stringify(schema)}` : 'Schema is provided by the host application; satisfy it exactly.',
  ].join('\n');
}

function isZodLike(schema: StructuredOutputSchema): schema is ZodLikeSchema {
  return typeof (schema as ZodLikeSchema).safeParse === 'function';
}

function validateJsonSchema(value: unknown, schema: JsonSchema, path: string): void {
  if (schema.enum && !schema.enum.some((item) => Object.is(item, value))) {
    throw new ToolExecutionError(`Structured output path '${path}' must be one of the schema enum values`);
  }
  if (schema.type && !matchesType(value, schema.type)) {
    throw new ToolExecutionError(`Structured output path '${path}' must be ${schema.type}`);
  }
  if (schema.type === 'object' || schema.properties) {
    if (!isRecord(value)) throw new ToolExecutionError(`Structured output path '${path}' must be object`);
    for (const required of schema.required ?? []) {
      if (value[required] === undefined) throw new ToolExecutionError(`Structured output path '${path}.${required}' is required`);
    }
    for (const [key, child] of Object.entries(schema.properties ?? {})) {
      if (value[key] !== undefined) validateJsonSchema(value[key], child, `${path}.${key}`);
    }
  }
  if (schema.type === 'array' || schema.items) {
    if (!Array.isArray(value)) throw new ToolExecutionError(`Structured output path '${path}' must be array`);
    if (schema.items) value.forEach((item, index) => validateJsonSchema(item, schema.items!, `${path}[${index}]`));
  }
}

function matchesType(value: unknown, type: NonNullable<JsonSchema['type']>): boolean {
  if (type === 'array') return Array.isArray(value);
  if (type === 'object') return isRecord(value);
  if (type === 'null') return value === null;
  return typeof value === type;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
