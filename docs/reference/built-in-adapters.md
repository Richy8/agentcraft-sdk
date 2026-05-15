# Built-In Adapters Reference

Adapters expose typed tools to an agent. Every adapter is attached with `.use(...)`, and tool execution still flows through `ToolPolicy`.

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import {
  FetchAdapter,
  LinkCheckerAdapter,
} from "@deskcreate/agentcraft/adapters";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
})
  .use(FetchAdapter.connect({ allowedDomains: ["example.com"] }))
  .use(LinkCheckerAdapter.connect());

const response = await agent.run({ prompt: "Check the links on example.com." });
console.log(response.content);
```

## Safety Defaults

| Behavior                 | Default                                                                                   |
| ------------------------ | ----------------------------------------------------------------------------------------- |
| Read tools               | Can run when exposed to the model.                                                        |
| Write tools              | Marked `requiresConfirmation` and blocked unless policy approves.                         |
| External tools           | Treated as untrusted input sources.                                                       |
| Domain/path scoped tools | Reject values outside configured allowlists.                                              |
| Cache replay             | Safe read/none tools may be cached; writes are never replayed as successful side effects. |

## Adapter Catalog

| Adapter                   | Purpose                                          | Required config                     | Optional config/defaults                                                                | Tools                                                                                                                                            |
| ------------------------- | ------------------------------------------------ | ----------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ApifyAdapter`            | Apify actors and datasets.                       | `token`                             | `apiBaseUrl`, `defaultDatasetId`, `timeoutMs`                                           | `scrape_url`, `crawl_site`, `run_actor`, `get_dataset_items`                                                                                     |
| `PlaywrightAdapter`       | Browser navigation and extraction.               | `launch` browser factory            | `allowedDomains`, `defaultTimeout`, `timeoutMs`                                         | `browse_url`, `click_element`, `fill_form`, `take_screenshot`, `extract_text`, `wait_for_selector`                                               |
| `FileSystemAdapter`       | Local rooted filesystem tools.                   | `rootPath`                          | `readOnly`, `allowedExtensions`                                                         | `read_file`, `list_directory`, `search_files`, `write_file`, `create_directory`, `move_file`, `delete_file`                                      |
| `DatabaseAdapter`         | Host-owned database queries and mutations.       | `execute` query function            | `dialect`, `readOnly`, `rowLimit`                                                       | `execute_query`, `fetch_records`, `insert_record`, `update_record`, `delete_record`, `list_tables`                                               |
| `SlackAdapter`            | Slack messages, history, channels, reactions.    | `token`                             | `defaultChannel`, `apiBaseUrl`, `timeoutMs`                                             | `send_message`, `send_reply`, `get_channel_history`, `list_channels`, `upload_file`, `add_reaction`                                              |
| `GitHubAdapter`           | Repository issues, PRs, files, branches.         | `token`                             | `allowedRepos`, `apiBaseUrl`, `timeoutMs`                                               | `get_repo`, `list_issues`, `create_issue`, `update_issue`, `list_prs`, `get_pr`, `create_pr`, `get_file_content`, `commit_file`, `list_branches` |
| `NotionAdapter`           | Notion search, pages, databases.                 | `token`                             | `defaultDatabaseId`, `apiBaseUrl`, `timeoutMs`                                          | Notion search/read/write tools, all write paths confirmation-gated.                                                                              |
| `GoogleSheetsAdapter`     | Google Sheets reads/writes.                      | `accessToken` or credentials config | `defaultSpreadsheetId`, `apiBaseUrl`, `timeoutMs`                                       | `get_spreadsheet`, `read_range`, `write_range`, `append_row`, `create_sheet`, `list_sheets`                                                      |
| `TavilySearchAdapter`     | Web search and page extraction.                  | `apiKey`                            | `searchDepth: 'basic'`, `maxResults`, `apiBaseUrl`, `timeoutMs`                         | `web_search`, `get_page_content`                                                                                                                 |
| `ElevenLabsAdapter`       | Speech and voice operations.                     | `apiKey`                            | `defaultVoiceId`, `defaultModel`, `apiBaseUrl`, `timeoutMs`                             | `text_to_speech`, `list_voices`, `get_voice`, `clone_voice`                                                                                      |
| `ImageGenerationAdapter`  | Image generation/editing.                        | `apiKey`                            | `provider`, `defaultModel`, `apiBaseUrl`, `timeoutMs`                                   | `generate_image`, `edit_image`, `generate_variations`                                                                                            |
| `MCPAdapter`              | Direct stdio/HTTP/SSE MCP server connection.     | Transport-specific config           | `allowedTools`, `allowedResources`, `roots`, metadata, tracing                          | Discovers MCP server tools.                                                                                                                      |
| `GoogleCalendarAdapter`   | Calendar read/write/free-busy.                   | `accessToken`                       | `defaultCalendarId: 'primary'`, `timezone`, `apiBaseUrl`, `timeoutMs`                   | `list_events`, `get_event`, `create_event`, `update_event`, `delete_event`, `find_free_slots`                                                    |
| `EmailAdapter`            | Email sends and templates.                       | `provider`, credentials/API key     | `apiBaseUrl`, `from`, `timeoutMs`                                                       | `send_email`, `send_template_email`, `list_templates`                                                                                            |
| `SupabaseAdapter`         | Supabase REST and storage.                       | `url`, `serviceRoleKey` or API key  | `timeoutMs`                                                                             | `query_table`, `insert_record`, `update_record`, `delete_record`, `rpc_call`, `storage_upload`, `storage_download`, `storage_list`               |
| `PineconeAdapter`         | Vector index operations.                         | `apiKey`, `indexName`               | `namespace`, `apiBaseUrl`, `timeoutMs`                                                  | `upsert_vectors`, `query_vectors`, `delete_vectors`, `list_indexes`, `describe_index`                                                            |
| `RedisAdapter`            | Key-value/list memory.                           | `client`                            | `keyPrefix`, `defaultTtl`                                                               | `get_value`, `set_value`, `delete_value`, `list_keys`, `expire_key`, `push_to_list`, `pop_from_list`, `get_list`                                 |
| `StorageAdapter`          | Object storage.                                  | `client`                            | Provider-specific client behavior                                                       | `upload_file`, `download_file`, `list_files`, `delete_file`, `get_signed_url`, `copy_file`                                                       |
| `FirecrawlAdapter`        | Web scrape/crawl/search/extract.                 | `apiKey`                            | `defaultFormats: ['markdown']`, `defaultTimeout`, `apiBaseUrl`, `timeoutMs`             | `scrape_url`, `crawl_site`, `search_web`, `extract_structured_data`                                                                              |
| `FetchAdapter`            | Guarded URL fetch.                               | None                                | `allowedProtocols: ['https:']`, `allowedDomains`, content types, size, headers, timeout | `fetch_url`                                                                                                                                      |
| `CitationManagerAdapter`  | Filesystem-backed citation index.                | None                                | `root: 'content/citations'`                                                             | `save_citation`, `read_citation`                                                                                                                 |
| `LinkCheckerAdapter`      | Read-only HTTPS link status checks.              | None                                | `timeoutMs: 5000`                                                                       | `check_link`                                                                                                                                     |
| `SeoAdapter`              | Provider-neutral SERP and keyword fixtures.      | None                                | `serpResults`, `keywordMetrics`; missing metrics return unavailable values              | `get_serp_results`, `get_keyword_metrics`                                                                                                        |
| `CreatorResourcesAdapter` | Brand voice, corpus, and asset resources.        | None                                | `brandVoice`, `corpus`, `assets`, `memoryStore`                                         | `read_brand_voice`, `search_content_corpus`, `list_creator_assets`                                                                               |
| `PublishingAdapter`       | Draft/publish commands for publishing workflows. | None                                | Write-gated by tool policy                                                              | `create_publish_draft`, `publish_content`                                                                                                        |
| `AnalyticsAdapter`        | Fixture or persisted analytics metrics.          | None                                | `metrics`, `historyStore`                                                               | `read_content_metrics`                                                                                                                           |

## Common Config Patterns

| Pattern                   | Example                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------- |
| Read-only local files     | `FileSystemAdapter.connect({ rootPath, readOnly: true })`                             |
| Domain-scoped fetch       | `FetchAdapter.connect({ allowedDomains: ['docs.example.com'] })`                      |
| Safe SEO fixtures         | `SeoAdapter.connect({ keywordMetrics: [...] })`                                       |
| Durable creator context   | `CreatorResourcesAdapter.connect({ memoryStore })`                                    |
| Approval-gated publishing | `PublishingAdapter.connect()` plus `toolPolicy.approvedTools` or `onApprovalRequired` |

For custom adapters, see [Adapter Authoring](../guides/adapter-authoring.md).
