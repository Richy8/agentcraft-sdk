# Engineering Domain Skills

The engineering domain provides 23 skills covering code review, architecture, debugging, testing, DevOps, and technical documentation. Use them to build AI-assisted development tooling, automated code review pipelines, and incident response agents.

## Quick Start

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { createSkillPackByName } from "@deskcreate/agentcraft/skills";
import { FetchAdapter, FileSystemAdapter } from "@deskcreate/agentcraft/adapters";
import { GitHubMcp } from "@deskcreate/agentcraft/mcp";

const agent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
  skillActivation: "auto",
})
  .use(createSkillPackByName("engineering"))
  .use(FileSystemAdapter.connect({ rootPath: "./src", readOnly: true }))
  .use(GitHubMcp.connect({ token: process.env.GITHUB_TOKEN!, allowedTools: ["list_pull_requests", "get_file_contents"] }));

const response = await agent.run({
  prompt: "/review-code Review src/agent/runtime.ts for type safety and edge case handling.",
});
console.log(response.content);
```

## Skills

### Code Review

| Skill | Directive | Purpose |
| --- | --- | --- |
| `code-review` | `/review-code` | General code review — correctness, readability, patterns |
| `security-code-review` | `/review-security` | Security-focused: injection, auth, secrets, input validation |
| `performance-code-review` | `/review-performance` | Performance: complexity, memory, DB query patterns |
| `api-contract-review` | `/review-api-contract` | API contract consistency, breaking changes, versioning |
| `system-boundary-review` | `/review-boundaries` | Module boundaries, coupling, interface contracts |

### Architecture

| Skill | Directive | Purpose |
| --- | --- | --- |
| `architecture-review` | `/review-architecture` | System design review — scalability, dependencies, trade-offs |
| `scalability-review` | `/review-scalability` | Horizontal/vertical scaling bottlenecks |
| `design-doc-writer` | `/write-design-doc` | Technical design documents from requirements |
| `migration-risk-review` | `/review-migration-risk` | Database and infrastructure migration risk analysis |

### Debugging and Incident Response

| Skill | Directive | Purpose |
| --- | --- | --- |
| `root-cause-analysis` | `/analyze-root-cause` | Structured root cause analysis from incident data |
| `log-analysis` | `/analyze-logs` | Extract patterns, errors, and anomalies from log output |
| `ci-failure-analysis` | `/analyze-ci-failure` | Diagnose CI/CD pipeline failures |
| `incident-fix-review` | `/review-incident-fix` | Review proposed fixes for incident correctness |
| `bug-reproduction-planner` | `/plan-reproduction` | Plan a minimal reproduction case for a reported bug |

### Testing

| Skill | Directive | Purpose |
| --- | --- | --- |
| `unit-test-generator` | `/generate-unit-tests` | Generate unit tests for a function or module |
| `integration-test-planner` | `/plan-integration-tests` | Plan integration test coverage |
| `test-plan-writer` | `/write-test-plan` | Write a full test plan for a feature |
| `edge-case-analysis` | `/analyze-edge-cases` | Enumerate edge cases for a given function or system |
| `regression-risk-review` | `/review-regression-risk` | Identify regression risks in a proposed change |

### DevOps

| Skill | Directive | Purpose |
| --- | --- | --- |
| `deployment-risk-review` | `/review-deployment-risk` | Risk assessment for a deployment or release |
| `infrastructure-change-review` | `/review-infra-change` | Review infrastructure changes (Terraform, k8s, etc.) |
| `dependency-risk-analysis` | `/analyze-dependency-risk` | Analyze NPM/dependency vulnerabilities and upgrade risk |
| `runbook-writer` | `/write-runbook` | Write an operational runbook for a service or process |

## Patterns

### PR Review Agent

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { createSkillPackByName } from "@deskcreate/agentcraft/skills";
import { GitHubMcp } from "@deskcreate/agentcraft/mcp";

const reviewAgent = Agent.create({
  model: Provider.openai["gpt-4o"],
  apiKey: process.env.OPENAI_API_KEY!,
  skillActivation: "directive-only",
})
  .use(createSkillPackByName("engineering"))
  .use(GitHubMcp.connect({
    token: process.env.GITHUB_TOKEN!,
    allowedTools: ["get_pull_request", "get_file_contents", "create_issue_comment"],
  }));

const response = await reviewAgent.run({
  prompt: `/review-code Fetch the diff for PR #142 and review it for correctness, edge cases, and test coverage.
  
  /review-security Flag any security concerns in the auth-related files.`,
});
```

### Incident Response Agent

```ts
const incidentAgent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
  skillActivation: "auto",
})
  .use(createSkillPackByName("engineering"))
  .use(FetchAdapter.connect({ allowedDomains: ["logs.yourcompany.com"] }));

const response = await incidentAgent.run({
  prompt: `/analyze-logs Fetch the error logs from the last 30 minutes at https://logs.yourcompany.com/api.

  /analyze-root-cause Based on the log patterns, identify the root cause of the 500 spike.`,
});
```

### Generate Tests for a Refactor

```ts
const response = await agent.run({
  promptFile: "prompts/generate-tests.prompt",
  vars: { filePath: "src/agent/cache-eligibility.ts", testFramework: "vitest" },
  skillActivation: "directive-only",
});
```

## Optional Adapters

Engineering skills benefit from these adapters when available:

| Adapter | Benefit |
| --- | --- |
| `FileSystemAdapter` | Read source files and configs directly |
| `GitHubAdapter` / `GitHubMcp` | Access PRs, diffs, and file contents |
| `FetchAdapter` | Fetch logs, documentation, or API specs |
| `DatabaseAdapter` | Query schema information for migration reviews |

## Related

- [Industry Domain Skills Overview](./overview.md)
- [Custom Skills](../custom.md)
- [GitHubMcp](../../mcp/built-in.md)
