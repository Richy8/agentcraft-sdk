# Eval Config

`AgentEval.suite()` and `.case()` configuration reference.

## Suite Config

```ts
import { AgentEval } from "@deskcreate/agentcraft";

const suite = AgentEval.suite({
  name: "Content Quality Suite",
  defaults: {
    maxCostUsd: 0.05,
    maxTotalTokens: 10_000,
  },
});
```

| Field      | Type            | Required | Description                                             |
| ---------- | --------------- | -------- | ------------------------------------------------------- |
| `name`     | `string`        | Yes      | Human-readable suite name. Appears in reports.          |
| `defaults` | `SuiteDefaults` | No       | Default budget applied to every case unless overridden. |

### `SuiteDefaults`

| Field            | Type     | Description              |
| ---------------- | -------- | ------------------------ |
| `maxCostUsd`     | `number` | Maximum cost per case.   |
| `maxTotalTokens` | `number` | Maximum tokens per case. |

## Case Config

```ts
suite.case({
  name: "Summarization quality",
  prompt: "Summarize the key benefits of TypeScript generics.",
  assertions: [
    { type: "contains", value: "type safety" },
    { type: "notContains", value: "I cannot" },
    { type: "matches", pattern: /\d+ benefit/i },
  ],
});
```

| Field          | Type          | Required | Description                                           |
| -------------- | ------------- | -------- | ----------------------------------------------------- |
| `name`         | `string`      | Yes      | Case name. Appears in reports.                        |
| `prompt`       | `string`      | Yes      | The prompt to send to the agent.                      |
| `assertions`   | `Assertion[]` | Yes      | One or more assertions to check against the response. |
| `budget`       | `RunBudget`   | No       | Per-case budget override.                             |
| `systemPrompt` | `string`      | No       | System prompt override for this case.                 |

## Assertion Types

| Type                  | Fields                              | Passes when                                       |
| --------------------- | ----------------------------------- | ------------------------------------------------- |
| `contains`            | `value: string`                     | Response text contains the string.                |
| `notContains`         | `value: string`                     | Response text does not contain the string.        |
| `matches`             | `pattern: RegExp`                   | Response text matches the regex.                  |
| `jsonPath`            | `path: string`, `expected: unknown` | Structured response at JSON path equals expected. |
| `toolCalled`          | `name: string`                      | The named tool was called during the run.         |
| `skillActivated`      | `name: string`                      | The named skill activated during the run.         |
| `cacheHitRateAtLeast` | `rate: number`                      | Cache hit rate is ≥ the given rate (0–1).         |

```ts
suite.case({
  name: "Uses web search tool",
  prompt: "What is the latest TypeScript version?",
  assertions: [
    { type: "toolCalled", name: "web_search" },
    { type: "contains", value: "TypeScript" },
  ],
});

suite.case({
  name: "Structured output is valid",
  prompt: "Extract the product name and price.",
  assertions: [
    { type: "jsonPath", path: "$.name", expected: "AgentCraft" },
    { type: "jsonPath", path: "$.price", expected: 0 },
  ],
});
```

## Running a Suite

```ts
const report = await AgentEval.run({
  agent: myAgent,
  suite,
});

console.log(`Status: ${report.status}`); // 'passed' | 'failed'
console.log(
  `${report.results.filter((r) => r.status === "passed").length}/${report.results.length} passed`,
);
```

## `EvalReport` Shape

```ts
interface EvalReport {
  status: "passed" | "failed";
  suiteName: string;
  results: CaseResult[];
  totalCost: number;
  totalTokens: number;
  durationMs: number;
}

interface CaseResult {
  name: string;
  status: "passed" | "failed";
  content: string;
  structuredResponse?: unknown;
  assertions: AssertionResult[];
  tokensUsed: TokenUsage;
  cost: number;
}
```

## Judge Mode (LLM-Based Evaluation)

Use a second LLM to evaluate subjective quality:

```ts
suite.case({
  name: "Response is professional",
  prompt: "Write a client update email.",
  assertions: [
    {
      type: "judge",
      prompt: "Is this response professional and appropriate for a client?",
      expectedVerdict: "yes",
      judgeModel: Provider.openai["gpt-4o"],
    },
  ],
});
```

## CI Integration

The eval runner exits with a non-zero code on failure, making it compatible with any CI system:

```sh
# Fails CI if any assertions fail
npx tsx scripts/run-eval.ts
```

Gate integration runs with an environment variable:

```ts
if (process.env.RUN_EVAL !== "true") process.exit(0);

const report = await AgentEval.run({ agent, suite });
if (report.status === "failed") process.exit(1);
```

## Related

- [AgentEval reference](../production/agent-eval.md)
- [Testing & Mocking](../production/testing.md)
- [Production examples](../examples-cookbook/production.md)
