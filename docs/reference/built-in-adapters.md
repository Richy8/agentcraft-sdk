# Built-In Adapters Reference

Adapters expose typed tools to an agent. Attach them with `.use(AdapterName.connect(config))`. All tool execution flows through `ToolPolicy` regardless of adapter — approval gates, read-only mode, redaction, and budget enforcement apply automatically.

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { TavilySearchAdapter, FileSystemAdapter } from "@deskcreate/agentcraft/adapters";

const agent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
  toolPolicy: { readOnly: true, maxResultBytes: 40_000 },
})
  .use(TavilySearchAdapter.connect({ apiKey: process.env.TAVILY_API_KEY! }))
  .use(FileSystemAdapter.connect({ rootPath: "./research", allowedExtensions: [".md"] }));

const response = await agent.run({ prompt: "Research and summarize agent caching strategies." });
console.log(response.content);
```

## Safety Defaults

| Behavior                | Default                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------- |
| Read tools              | Run when exposed to the model.                                                              |
| Write tools             | Marked `requiresConfirmation` — blocked unless policy or callback approves.                 |
| External tools          | Treated as untrusted input sources — redact secrets from results.                           |
| Domain/path scoped      | Reject values outside configured allowlists at the adapter layer.                           |
| Cache replay            | Safe read tools may be cached; writes are never replayed as successful side effects.        |

## Adapter Catalog

| Adapter                   | Purpose                                                | Required config             | Key optional config                                    | Tools                                                                                       |
| ------------------------- | ------------------------------------------------------ | --------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| `FileSystemAdapter`       | Local rooted file reads/writes.                        | `rootPath`                  | `readOnly`, `allowedExtensions`                        | `read_file`, `list_directory`, `search_files`, `write_file`, `create_directory`, `delete_file` |
| `FetchAdapter`            | Allowlist-guarded URL fetch.                           | None                        | `allowedDomains`, `maxResponseBytes`, `timeoutMs`      | `fetch_url`                                                                                 |
| `TavilySearchAdapter`     | Web search and page extraction.                        | `apiKey`                    | `searchDepth`, `maxResults`, `timeoutMs`               | `web_search`, `get_page_content`                                                            |
| `FirecrawlAdapter`        | Web scrape, crawl, search, structured extraction.      | `apiKey`                    | `defaultFormats`, `defaultTimeout`                     | `scrape_url`, `crawl_site`, `search_web`, `extract_structured_data`                         |
| `GitHubAdapter`           | Repo issues, PRs, files, and branches.                 | `token`                     | `allowedRepos`, `timeoutMs`                            | `get_repo`, `list_issues`, `create_issue`, `get_pr`, `create_pr`, `get_file_content`, `commit_file` |
| `SlackAdapter`            | Slack messages, history, channels.                     | `token`                     | `defaultChannel`, `timeoutMs`                          | `send_message`, `send_reply`, `get_channel_history`, `list_channels`, `upload_file`         |
| `EmailAdapter`            | Email send and templates.                              | `provider`, credentials     | `from`, `timeoutMs`                                    | `send_email`, `send_template_email`, `list_templates`                                       |
| `DatabaseAdapter`         | Host-owned DB queries and mutations.                   | `execute` function          | `dialect`, `readOnly`, `rowLimit`                      | `execute_query`, `fetch_records`, `insert_record`, `update_record`, `delete_record`         |
| `GoogleSheetsAdapter`     | Spreadsheet reads and writes.                          | `accessToken`               | `defaultSpreadsheetId`                                 | `get_spreadsheet`, `read_range`, `write_range`, `append_row`, `list_sheets`                 |
| `GoogleCalendarAdapter`   | Calendar events and free/busy slots.                   | `accessToken`               | `defaultCalendarId`, `timezone`                        | `list_events`, `create_event`, `update_event`, `delete_event`, `find_free_slots`            |
| `NotionAdapter`           | Notion pages, databases, search.                       | `token`                     | `defaultDatabaseId`, `timeoutMs`                       | Notion search/read/write tools (write paths confirmation-gated)                             |
| `PlaywrightAdapter`       | Browser navigation, interaction, screenshots.          | `launch` factory            | `allowedDomains`, `timeoutMs`                          | `browse_url`, `click_element`, `fill_form`, `take_screenshot`, `extract_text`               |
| `ApifyAdapter`            | Apify actors and datasets.                             | `token`                     | `apiBaseUrl`, `defaultDatasetId`, `timeoutMs`          | `scrape_url`, `crawl_site`, `run_actor`, `get_dataset_items`                                |
| `ElevenLabsAdapter`       | Text-to-speech and voice management.                   | `apiKey`                    | `defaultVoiceId`, `defaultModel`                       | `text_to_speech`, `list_voices`, `get_voice`, `clone_voice`                                 |
| `ImageGenerationAdapter`  | Image generation and editing.                          | `apiKey`                    | `provider`, `defaultModel`                             | `generate_image`, `edit_image`, `generate_variations`                                       |
| `SupabaseAdapter`         | Supabase REST, storage, and RPC.                       | `url`, `serviceRoleKey`     | `timeoutMs`                                            | `query_table`, `insert_record`, `update_record`, `rpc_call`, `storage_upload`               |
| `PineconeAdapter`         | Vector index operations.                               | `apiKey`, `indexName`       | `namespace`, `timeoutMs`                               | `upsert_vectors`, `query_vectors`, `delete_vectors`, `describe_index`                       |
| `RedisAdapter`            | Key-value and list operations.                         | `client`                    | `keyPrefix`, `defaultTtl`                              | `get_value`, `set_value`, `delete_value`, `list_keys`, `push_to_list`                       |
| `StorageAdapter`          | Object storage (S3-compatible).                        | `client`                    | Provider-specific client behavior                      | `upload_file`, `download_file`, `list_files`, `delete_file`, `get_signed_url`               |
| `McpAdapter`              | Generic stdio/HTTP MCP server connection.              | Transport-specific          | `allowedTools`, `allowedResources`, `roots`            | Discovers tools from MCP server at startup                                                  |
| `CitationManagerAdapter`  | Filesystem-backed citation index.                      | None                        | `root: 'content/citations'`                            | `save_citation`, `read_citation`                                                            |
| `LinkCheckerAdapter`      | Read-only HTTPS link status checks.                    | None                        | `timeoutMs: 5000`, `allowedDomains`                    | `check_link`                                                                                |
| `SeoAdapter`              | Provider-neutral SERP and keyword fixtures.            | None                        | `serpResults`, `keywordMetrics`                        | `get_serp_results`, `get_keyword_metrics`                                                   |
| `CreatorResourcesAdapter` | Brand voice, content corpus, creator assets.           | None                        | `brandVoice`, `corpus`, `assets`, `memoryStore`        | `read_brand_voice`, `search_content_corpus`, `list_creator_assets`                          |
| `PublishingAdapter`       | Draft and publish commands for creator workflows.      | None                        | Write-gated by tool policy                             | `create_publish_draft`, `publish_content`                                                   |
| `AnalyticsAdapter`        | Fixture or persisted content analytics metrics.        | None                        | `metrics`, `historyStore`                              | `read_content_metrics`                                                                      |

## Common Usage Patterns

### Read-Only File Access

```ts
import { FileSystemAdapter } from "@deskcreate/agentcraft/adapters";

agent.use(FileSystemAdapter.connect({
  rootPath: "./src",
  readOnly: true,
  allowedExtensions: [".ts", ".tsx", ".md"],
}));
```

### Domain-Restricted Web Fetch

```ts
import { FetchAdapter } from "@deskcreate/agentcraft/adapters";

agent.use(FetchAdapter.connect({
  allowedDomains: ["developer.mozilla.org", "tc39.es", "docs.anthropic.com"],
  maxResponseBytes: 100_000,
}));
```

### Approval-Gated File Writes

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { FileSystemAdapter } from "@deskcreate/agentcraft/adapters";

const agent = Agent.create({
  model: Provider.openai["gpt-4o"],
  apiKey: process.env.OPENAI_API_KEY!,
  toolPolicy: {
    requireConfirmation: ["write_file", "delete_file", "create_directory"],
  },
}).use(FileSystemAdapter.connect({
  rootPath: "./content",
  allowedExtensions: [".md"],
}));
```

### Web Search + File Write Pipeline

```ts
import { TavilySearchAdapter, FileSystemAdapter } from "@deskcreate/agentcraft/adapters";

agent
  .use(TavilySearchAdapter.connect({ apiKey: process.env.TAVILY_API_KEY! }))
  .use(FileSystemAdapter.connect({
    rootPath: "./research",
    allowedExtensions: [".md"],
  }));

const response = await agent.run({
  prompt: "Research TypeScript agent frameworks and save a summary to ./research/frameworks.md.",
  budget: { maxToolCalls: 8 },
  toolPolicy: { approvedTools: ["web_search", "write_file"] },
});
```

### Approval-Gated Email Send

```ts
import { EmailAdapter } from "@deskcreate/agentcraft/adapters";

agent.use(EmailAdapter.connect({
  provider: "sendgrid",
  apiKey: process.env.SENDGRID_API_KEY!,
  from: "agent@company.com",
}));

// toolPolicy.requireConfirmation: ["send_email"] blocks send until approved
```

### Database Read-Only

```ts
import { DatabaseAdapter } from "@deskcreate/agentcraft/adapters";
import { pool } from "./db";

agent.use(DatabaseAdapter.connect({
  execute: (sql, params) => pool.query(sql, params).then(r => r.rows),
  dialect: "postgres",
  readOnly: true,
  rowLimit: 500,
}));
```

### Creator Resources With Memory Store

```ts
import { CreatorResourcesAdapter } from "@deskcreate/agentcraft/adapters";
import { FileSystemCreatorMemoryStore } from "@deskcreate/agentcraft";

const memoryStore = new FileSystemCreatorMemoryStore(".agentcraft/creator-memory");

agent.use(CreatorResourcesAdapter.connect({ memoryStore }));
```

### Browser Automation

```ts
import { PlaywrightAdapter } from "@deskcreate/agentcraft/adapters";

agent.use(PlaywrightAdapter.connect({ headless: true }));

const response = await agent.run({
  prompt: `Navigate to http://localhost:3000/checkout.
  Verify the "Start Free Trial" button is visible above the fold.
  Report any console errors.`,
  budget: { maxToolCalls: 5 },
});
```

## Config Patterns Summary

| Pattern                      | Config                                                                    |
| ---------------------------- | ------------------------------------------------------------------------- |
| Read-only local files        | `FileSystemAdapter.connect({ rootPath, readOnly: true })`                 |
| Domain-scoped fetch          | `FetchAdapter.connect({ allowedDomains: [...] })`                         |
| Approval-gated writes        | `toolPolicy: { requireConfirmation: ["write_file"] }`                     |
| Durable creator context      | `CreatorResourcesAdapter.connect({ memoryStore })`                        |
| Approval-gated publishing    | `PublishingAdapter.connect()` + `toolPolicy.requireConfirmation`           |
| Safe SEO fixtures            | `SeoAdapter.connect({ keywordMetrics: [...] })`                           |
| Analytics snapshot           | `AnalyticsAdapter.connect({ historyStore })`                              |

For custom adapter authoring, see [Adapter Authoring](../guides/adapter-authoring.md).

More patterns: [Adapter Config](../configuration/adapter-config.md), [tools and adapters cookbook](../examples-cookbook/tools-adapters.md).
