# AgentCraft Live Living Primitives Test Report

Generated: 2026-05-14T09:34:55.215Z

Model: openai:gpt-4o-mini

## Workspace + Workflow + Cache + Artifact Store

| Signal                                           |    Result |
| ------------------------------------------------ | --------: |
| First workflow status                            | completed |
| Second workflow status                           | completed |
| Real safe-tool executions                        |         1 |
| Cache misses                                     |         1 |
| Cache hits                                       |         2 |
| Workflow step started events                     |         4 |
| Workflow step completed events                   |         4 |
| Artifact write events                            |         8 |
| Draft artifacts stored                           |         2 |
| Completed WorkflowRun artifacts                  |         2 |
| Required-cache live output contained probe value |       yes |

First live output:

```text
living-primitives-ok workspace workflow cache
```

Second live output:

```text
living-primitives-ok workspace workflow cache
```

Required-cache live output:

```text
living-primitives-ok
```

Result: the first live workflow executed the workspace adapter tool and wrote artifacts. The second live workflow used the cached tool result, emitted cache-hit telemetry, and persisted an independent workflow run. The final live run required a cached result for the probe tool and completed without another real tool execution.
