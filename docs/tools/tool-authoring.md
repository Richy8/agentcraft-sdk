# Tool Authoring

Good tools are small, typed, scoped, and honest about side effects.

## Authoring Checklist

| Area     | Rule                             | Why                                       |
| -------- | -------------------------------- | ----------------------------------------- |
| Name     | Use stable snake_case.           | Models and tests depend on it.            |
| Params   | Validate every input.            | Prevents malformed tool calls.            |
| Results  | Return small structured objects. | Easier to cache, trace, and reason about. |
| Security | Set side effect and scopes.      | Enables policy and docs.                  |

## Example

```ts
const getCustomer = tool({
  name: "get_customer",
  description: "Read customer profile by id.",
  security: { sideEffect: "read", scopes: ["customers:read"] },
  params: {
    customerId: { type: "string", description: "Customer id." },
  },
  run: async ({ customerId }) => ({ id: customerId, plan: "pro" }),
});
```

## Next

- Wrap tools in [Custom Adapters](../adapters/custom.md).
- Protect tools with [ToolPolicy](./tool-policy.md).
