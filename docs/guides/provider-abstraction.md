# Provider Abstraction Guide

Providers implement `ProviderProtocol`.

Each protocol is responsible for:

- constructing its SDK client
- formatting base requests
- formatting tool requests
- extracting text, usage, finish reason, and tool calls
- formatting follow-up turns after tool execution
- streaming chunks when supported
- mapping provider errors into `AgentCraftError` subclasses

`UnifiedProvider` handles retry behavior and delegates provider-specific details to the protocol. Add new providers by registering a protocol in `provider-registry/registry.ts` and adding model capabilities to `model-registry/catalog.ts`.

## Agent Provider Config

The same provider config can be supplied through `Agent.create()` or lower-level provider factory utilities. See the [Configuration Reference](./config-reference.md) for the complete field list.

| Field                                             | Required          | Purpose                                                                                                                                                |
| ------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `model`                                           | Yes               | Selects the model id, registry metadata, capability checks, pricing estimate, and protocol driver. Prefer typed `Provider.*` constants when available. |
| `apiKey`                                          | Provider-specific | Authenticates OpenAI, Anthropic, Gemini, Cohere, DeepSeek, and OpenAI-compatible cloud providers. Local providers normally omit it.                    |
| `baseUrl`                                         | Optional          | Points OpenAI-compatible protocols at custom gateways, local servers, or provider-specific endpoints.                                                  |
| `timeout`                                         | Optional          | Protects callers from hanging provider requests.                                                                                                       |
| `temperature`, `topP`, penalties, `stopSequences` | Optional          | Generation controls. Keep defaults unless the workflow has a measurable quality or determinism requirement.                                            |
| `responseFormat`                                  | Optional          | Requests text or native JSON mode. Use `responseSchema` at run time when correctness matters.                                                          |

Provider-specific credential fields:

| Provider        | Required fields                    | Recommendation                                                                                                                              |
| --------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Azure OpenAI    | `apiKey`, `endpoint`, `deployment` | Treat `deployment` as the Azure deployment name. Keep `apiVersion` explicit in production to avoid silent behavior changes.                 |
| Bedrock         | `region`                           | Prefer AWS default credential chain or short-lived roles. Use `accessKeyId` and `secretAccessKey` only for constrained local/dev scenarios. |
| Vertex AI       | `project`                          | Prefer workload identity or application default credentials. Set `location` when model availability or data residency matters.              |
| Local providers | Optional `baseUrl`                 | Use for Ollama, LM Studio, vLLM, and LocalAI. Pair with budgets because local model context windows vary widely.                            |

## Protocol Contract

A provider protocol should keep all vendor-specific behavior behind `ProviderProtocol`:

- request shape construction for text, multimodal, tool, and structured-output calls
- model capability translation such as tool calling, streaming, JSON mode, image/audio/video/files
- provider stream parsing into normalized `model_delta`, `tool_call`, `tool_result`, and `final` events
- follow-up state formatting after tool execution
- usage extraction for token accounting and cost estimation
- error normalization into typed AgentCraft errors

Do not leak provider SDK response objects through public API responses. Normalize provider differences at the protocol boundary so application code can remain provider-portable.
