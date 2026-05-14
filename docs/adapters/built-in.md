# Built-In Adapters

Built-in adapters are imported from `agentcraft/adapters`, connected with `.connect(...)`, and attached with `.use(...)`. They expose exact tool names to the model, and every tool still runs through [Tool Policy](../tools/tool-policy.md), [Guardrails](../tools/guardrails.md), and [Approvals](../tools/approvals.md).

```ts
import { Agent, Provider } from "agentcraft";
import {
  FetchAdapter,
  LinkCheckerAdapter,
  SeoAdapter,
} from "agentcraft/adapters";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  toolPolicy: { readOnly: true, maxResultBytes: 20_000 },
})
  .use(FetchAdapter.connect({ allowedDomains: ["developer.mozilla.org"] }))
  .use(LinkCheckerAdapter.connect())
  .use(SeoAdapter.connect());

await agent.run({
  prompt: "Audit the linked page and summarize SEO issues.",
  budget: { maxToolCalls: 6 },
});
```

## Web And Browser

### FetchAdapter

Use `FetchAdapter` for guarded URL reads. It is the simplest read-only web adapter.

Tools: `fetch_url`.

Required config: none.

Common optional config: `allowedProtocols`, `allowedDomains`, `allowedContentTypes`, `maxBytes`, `headers`, `timeoutMs`.

```ts
agent.use(
  FetchAdapter.connect({
    allowedDomains: ["docs.github.com", "developer.mozilla.org"],
  }),
);
```

### FirecrawlAdapter

Use `FirecrawlAdapter` for hosted scrape, crawl, search, and extraction workflows.

Tools: `scrape_url`, `crawl_site`, `search_web`, `extract_structured_data`.

Required config: `apiKey`.

Common optional config: `defaultFormats`, `defaultTimeout`, `apiBaseUrl`, `timeoutMs`.

```ts
agent.use(FirecrawlAdapter.connect({ apiKey: process.env.FIRECRAWL_API_KEY! }));
```

### TavilySearchAdapter

Use `TavilySearchAdapter` for search and page content extraction.

Tools: `web_search`, `get_page_content`.

Required config: `apiKey`.

Common optional config: `searchDepth`, `maxResults`, `apiBaseUrl`, `timeoutMs`.

```ts
agent.use(
  TavilySearchAdapter.connect({
    apiKey: process.env.TAVILY_API_KEY!,
    maxResults: 5,
  }),
);
```

### PlaywrightAdapter

Use `PlaywrightAdapter` for browser navigation, screenshots, page text, clicks, and form filling.

Tools: `browse_url`, `click_element`, `fill_form`, `take_screenshot`, `extract_text`, `wait_for_selector`.

Required config: a `launch` browser factory when running live browser automation.

Common optional config: `allowedDomains`, `defaultTimeout`, `timeoutMs`.

```ts
agent.use(
  PlaywrightAdapter.connect({
    allowedDomains: ["example.org"],
    defaultTimeout: 10_000,
  }),
);
```

## Local And Data

### FileSystemAdapter

Use `FileSystemAdapter` for rooted local file reads and writes.

Tools: `read_file`, `list_directory`, `search_files`, `write_file`, `create_directory`, `move_file`, `delete_file`.

Required config: `rootPath`.

Common optional config: `readOnly`, `allowedExtensions`.

```ts
agent.use(
  FileSystemAdapter.connect({
    rootPath: "./content",
    allowedExtensions: [".md", ".json"],
    readOnly: true,
  }),
);
```

### DatabaseAdapter

Use `DatabaseAdapter` when your app owns the database client and wants AgentCraft to call a controlled executor.

Tools: `execute_query`, `fetch_records`, `insert_record`, `update_record`, `delete_record`, `list_tables`.

Required config: `execute`.

Common optional config: `dialect`, `readOnly`, `rowLimit`.

```ts
agent.use(
  DatabaseAdapter.connect({
    readOnly: true,
    rowLimit: 50,
    execute: async (query) => db.query(query),
  }),
);
```

### GoogleSheetsAdapter

Use `GoogleSheetsAdapter` for spreadsheet reads and controlled writes.

Tools: `get_spreadsheet`, `read_range`, `write_range`, `append_row`, `create_sheet`, `list_sheets`.

Required config: `accessToken` or credentials config.

Common optional config: `defaultSpreadsheetId`, `apiBaseUrl`, `timeoutMs`.

```ts
agent.use(
  GoogleSheetsAdapter.connect({
    accessToken: process.env.GOOGLE_ACCESS_TOKEN!,
    defaultSpreadsheetId: process.env.GOOGLE_SHEET_ID,
  }),
);
```

### SupabaseAdapter

Use `SupabaseAdapter` for Supabase REST tables, RPC calls, and storage.

Tools: `query_table`, `insert_record`, `update_record`, `delete_record`, `rpc_call`, `storage_upload`, `storage_download`, `storage_list`.

Required config: `url` plus service role key or API key.

```ts
agent.use(
  SupabaseAdapter.connect({
    url: process.env.SUPABASE_URL!,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  }),
);
```

### RedisAdapter

Use `RedisAdapter` for key-value and list memory through an injected Redis-like client.

Tools: `get_value`, `set_value`, `delete_value`, `list_keys`, `expire_key`, `push_to_list`, `pop_from_list`, `get_list`.

Required config: `client`.

Common optional config: `keyPrefix`, `defaultTtl`.

```ts
agent.use(RedisAdapter.connect({ client: redis, keyPrefix: "agentcraft:" }));
```

### PineconeAdapter

Use `PineconeAdapter` for vector index operations.

Tools: `upsert_vectors`, `query_vectors`, `delete_vectors`, `list_indexes`, `describe_index`.

Required config: `apiKey`, `indexName`.

Common optional config: `namespace`, `apiBaseUrl`, `timeoutMs`.

```ts
agent.use(
  PineconeAdapter.connect({
    apiKey: process.env.PINECONE_API_KEY!,
    indexName: "content",
  }),
);
```

### StorageAdapter

Use `StorageAdapter` for object storage through an injected client.

Tools: `upload_file`, `download_file`, `list_files`, `delete_file`, `get_signed_url`, `copy_file`.

Required config: `client`.

```ts
agent.use(StorageAdapter.connect({ client: storageClient }));
```

## Productivity And Collaboration

### GitHubAdapter

Use `GitHubAdapter` for repositories, issues, PRs, branches, and file commits.

Tools: `get_repo`, `list_issues`, `create_issue`, `update_issue`, `list_prs`, `get_pr`, `create_pr`, `get_file_content`, `commit_file`, `list_branches`.

Required config: `token`.

Common optional config: `allowedRepos`, `apiBaseUrl`, `timeoutMs`.

```ts
agent.use(
  GitHubAdapter.connect({
    token: process.env.GITHUB_PERSONAL_ACCESS_TOKEN!,
    allowedRepos: ["openai/openai-node"],
  }),
);
```

### NotionAdapter

Use `NotionAdapter` for Notion search, pages, and databases.

Tools: `search_notion`, `get_page`, `create_page`, `update_page`, `get_database`, `query_database`, `create_database_entry`.

Required config: `token`.

Common optional config: `defaultDatabaseId`, `defaultParentId`, `apiBaseUrl`, `timeoutMs`.

```ts
agent.use(
  NotionAdapter.connect({
    token: process.env.NOTION_TOKEN!,
    defaultDatabaseId: process.env.NOTION_DATABASE_ID,
  }),
);
```

### SlackAdapter

Use `SlackAdapter` for Slack messages, history, channels, uploads, and reactions.

Tools: `send_message`, `send_reply`, `get_channel_history`, `list_channels`, `upload_file`, `add_reaction`.

Required config: `token`.

Common optional config: `defaultChannel`, `apiBaseUrl`, `timeoutMs`.

```ts
agent.use(
  SlackAdapter.connect({
    token: process.env.SLACK_BOT_TOKEN!,
    defaultChannel: "C123",
  }),
);
```

### EmailAdapter

Use `EmailAdapter` for sending email and reading templates through supported providers.

Tools: `send_email`, `send_template_email`, `list_templates`.

Required config: `provider` plus provider credentials/API key.

Common optional config: `apiBaseUrl`, `from`, `timeoutMs`.

```ts
agent.use(
  EmailAdapter.connect({
    provider: "resend",
    apiKey: process.env.RESEND_API_KEY!,
    from: "team@example.com",
  }),
);
```

### GoogleCalendarAdapter

Use `GoogleCalendarAdapter` for calendar reads, event writes, and free/busy checks.

Tools: `list_events`, `get_event`, `create_event`, `update_event`, `delete_event`, `find_free_slots`.

Required config: `accessToken`.

Common optional config: `defaultCalendarId`, `timezone`, `apiBaseUrl`, `timeoutMs`.

```ts
agent.use(
  GoogleCalendarAdapter.connect({
    accessToken: process.env.GOOGLE_ACCESS_TOKEN!,
  }),
);
```

## Creator And Media

### CreatorResourcesAdapter

Use `CreatorResourcesAdapter` for brand voice, content corpus search, and asset inventory.

Tools: `read_brand_voice`, `search_content_corpus`, `list_creator_assets`.

Required config: none.

Common optional config: `brandVoice`, `corpus`, `assets`, `memoryStore`.

```ts
agent.use(
  CreatorResourcesAdapter.connect({
    brandVoice: { tone: "practical", bannedPhrases: ["game changer"] },
    corpus: [{ id: "launch-note", text: "Prior launch note content." }],
  }),
);
```

### CitationManagerAdapter

Use `CitationManagerAdapter` for a local citation index.

Tools: `save_citation`, `read_citation`.

Required config: none.

Common optional config: `root`.

```ts
agent.use(CitationManagerAdapter.connect({ root: "content/citations" }));
```

### LinkCheckerAdapter

Use `LinkCheckerAdapter` for read-only HTTPS link status checks.

Tools: `check_link`.

Required config: none.

Common optional config: `timeoutMs`.

```ts
agent.use(LinkCheckerAdapter.connect({ timeoutMs: 5_000 }));
```

### SeoAdapter

Use `SeoAdapter` for provider-neutral SERP and keyword fixtures.

Tools: `get_serp_results`, `get_keyword_metrics`.

Required config: none.

Common optional config: `serpResults`, `keywordMetrics`.

```ts
agent.use(SeoAdapter.connect({ keywordMetrics: [] }));
```

### PublishingAdapter

Use `PublishingAdapter` for draft creation and publish commands. Keep this approval-gated.

Tools: `create_publish_draft`, `publish_content`.

Required config: none.

```ts
agent.use(PublishingAdapter.connect());
```

### AnalyticsAdapter

Use `AnalyticsAdapter` for fixture or persisted content metrics.

Tools: `read_content_metrics`.

Required config: none.

Common optional config: `metrics`, `historyStore`.

```ts
agent.use(AnalyticsAdapter.connect({ metrics: [] }));
```

### ImageGenerationAdapter

Use `ImageGenerationAdapter` for image generation, edits, and variations.

Tools: `generate_image`, `edit_image`, `generate_variations`.

Required config: `apiKey`.

Common optional config: `provider`, `defaultModel`, `defaultSize`, `apiBaseUrl`, `timeoutMs`.

```ts
agent.use(
  ImageGenerationAdapter.connect({
    provider: "openai",
    apiKey: process.env.OPENAI_API_KEY!,
  }),
);
```

### ElevenLabsAdapter

Use `ElevenLabsAdapter` for speech and voice operations.

Tools: `text_to_speech`, `list_voices`, `get_voice`, `clone_voice`.

Required config: `apiKey`.

Common optional config: `defaultVoiceId`, `defaultModel`, `apiBaseUrl`, `timeoutMs`.

```ts
agent.use(
  ElevenLabsAdapter.connect({ apiKey: process.env.ELEVENLABS_API_KEY! }),
);
```

## Automation And External Runtime

### ApifyAdapter

Use `ApifyAdapter` for Apify actors and datasets.

Tools: `scrape_url`, `crawl_site`, `run_actor`, `get_dataset_items`.

Required config: `token`.

Common optional config: `apiBaseUrl`, `defaultDatasetId`, `timeoutMs`.

```ts
agent.use(ApifyAdapter.connect({ token: process.env.APIFY_TOKEN! }));
```

### MCPAdapter

Use `MCPAdapter` when a server is not covered by a built-in wrapper or when you want a direct stdio, HTTP, or SSE MCP connection.

Tools: discovered from the MCP server, optionally narrowed with `allowedTools`.

Required config: transport-specific `command`/`args` or `url`.

Common optional config: `allowedTools`, `allowedResources`, `roots`, `metadata`, `onTrace`.

```ts
agent.use(
  MCPAdapter.connect({
    transport: "http",
    url: "https://mcp.example.internal/mcp",
    allowedTools: ["search_docs"],
  }),
);
```

More examples: [Adapter Config](../configuration/adapter-config.md), [Adapter Safety](./safety.md), [Tools And Adapters Cookbook](../examples-cookbook/tools-adapters.md).
