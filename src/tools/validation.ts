export interface ToolArgumentValidationDefinition {
  name: string;
  parameters: {
    properties: Record<string, { type: string; enum?: string[] }>;
    required: readonly string[];
  };
}

export interface ToolArgumentValidationIssue {
  message: string;
  context: Record<string, unknown>;
}

export type ToolArgumentErrorFactory = (issue: ToolArgumentValidationIssue) => Error;

export function validateToolArguments(
  tool: ToolArgumentValidationDefinition,
  args: Record<string, unknown>,
  createError: ToolArgumentErrorFactory = (issue) => new Error(issue.message)
): void {
  for (const required of tool.parameters.required) {
    if (args[required] === undefined) {
      throw createError({
        message: `Tool '${tool.name}' missing required argument '${required}'`,
        context: { toolName: tool.name, argument: required },
      });
    }
  }

  for (const [name, schema] of Object.entries(tool.parameters.properties)) {
    const value = args[name];
    if (value === undefined) continue;

    const valid =
      (schema.type === 'array' && Array.isArray(value)) ||
      (schema.type === 'object' &&
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value)) ||
      (schema.type !== 'array' && schema.type !== 'object' && typeof value === schema.type);

    if (!valid) {
      throw createError({
        message: `Tool '${tool.name}' argument '${name}' must be ${schema.type}`,
        context: { toolName: tool.name, argument: name, expectedType: schema.type },
      });
    }

    if (schema.enum && !schema.enum.includes(String(value))) {
      throw createError({
        message: `Tool '${tool.name}' argument '${name}' must be one of: ${schema.enum.join(', ')}`,
        context: { toolName: tool.name, argument: name },
      });
    }
  }
}
