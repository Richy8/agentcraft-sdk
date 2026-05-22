# Adapter Config

Adapters expose typed tools to the agent. Attach them with `.use(AdapterName.connect(config))`. Tool execution flows through `ToolPolicy` regardless of adapter — so approval gates, read-only mode, and redaction apply automatically.

## Attach Pattern

| Step    | Action                                                              | Required?   | Related page                                          |
| ------- | ------------------------------------------------------------------- | ----------- | ----------------------------------------------------- |
| Import  | `import { FileSystemAdapter } from '@deskcreate/agentcraft/adapters'` | Yes       | [Built-In Adapters](../reference/built-in-adapters.md)|
| Connect | `FileSystemAdapter.connect(config)`                                 | Yes         | See per-adapter tables below                          |
| Attach  | `agent.use(adapter)`                                                | Yes         | [Agents](../core/agents.md)                           |
| Govern  | `toolPolicy`, guardrails, approval callbacks                        | Recommended | [Tool Policy Config](./tool-policy-config.md)         |

## FileSystemAdapter

Read and write files within a bounded root directory.

| Option              | Required | Default          | Purpose                                                         |
| ------------------- | -------- | ---------------- | --------------------------------------------------------------- |
| `rootPath`          | Yes      | None             | Root directory. All file paths are resolved under this root.    |
| `readOnly`          | No       | `false`          | When `true`, write/delete tools are not exposed.                |
| `allowedExtensions` | No       | All extensions   | Allowlist of file extensions (e.g., `[".ts", ".md"]`).          |

```ts
import { FileSystemAdapter } from "@deskcreate/agentcraft/adapters";

agent.use(FileSystemAdapter.connect({
  rootPath: "./src",
  readOnly: true,
  allowedExtensions: [".ts", ".tsx"],
}));
```

**Tools:** `read_file`, `list_directory`, `search_files`, `write_file` (write-only), `create_directory`, `move_file`, `delete_file`.

## FetchAdapter

Fetch URL content with allowlist enforcement.

| Option             | Required | Default              | Purpose                                                           |
| ------------------ | -------- | -------------------- | ----------------------------------------------------------------- |
| `allowedDomains`   | No       | All HTTPS domains    | Restricts fetch to these domains. Strongly recommended.           |
| `allowedProtocols` | No       | `['https:']`         | Only HTTPS by default — do not add `http:` in production.        |
| `maxResponseBytes` | No       | `500_000`            | Max bytes returned per fetch. Prevents large payload injection.   |
| `timeoutMs`        | No       | `15_000`             | Per-request timeout.                                              |
| `headers`          | No       | `{}`                 | Static headers added to every request.                            |

```ts
import { FetchAdapter } from "@deskcreate/agentcraft/adapters";

agent.use(FetchAdapter.connect({
  allowedDomains: ["developer.mozilla.org", "tc39.es"],
  maxResponseBytes: 100_000,
}));
```

**Tools:** `fetch_url`.

## TavilySearchAdapter

Web search and page content extraction via Tavily.

| Option        | Required | Default   | Purpose                                            |
| ------------- | -------- | --------- | -------------------------------------------------- |
| `apiKey`      | Yes      | None      | Tavily API key.                                    |
| `searchDepth` | No       | `'basic'` | `'basic'` or `'advanced'`. Advanced costs more.    |
| `maxResults`  | No       | `5`       | Max search results per query.                      |
| `timeoutMs`   | No       | `15_000`  | Per-request timeout.                               |

```ts
import { TavilySearchAdapter } from "@deskcreate/agentcraft/adapters";

agent.use(TavilySearchAdapter.connect({
  apiKey: process.env.TAVILY_API_KEY!,
  searchDepth: "basic",
  maxResults: 5,
}));
```

**Tools:** `web_search`, `get_page_content`.

## FirecrawlAdapter

Web scrape, crawl, keyword search, and structured data extraction.

| Option            | Required | Default          | Purpose                                                         |
| ----------------- | -------- | ---------------- | --------------------------------------------------------------- |
| `apiKey`          | Yes      | None             | Firecrawl API key.                                              |
| `defaultFormats`  | No       | `['markdown']`   | Output formats returned by scrape and crawl tools.              |
| `defaultTimeout`  | No       | `30_000`         | Default per-request timeout in milliseconds.                    |

```ts
import { FirecrawlAdapter } from "@deskcreate/agentcraft/adapters";

agent.use(FirecrawlAdapter.connect({
  apiKey: process.env.FIRECRAWL_API_KEY!,
  defaultFormats: ["markdown"],
}));
```

**Tools:** `scrape_url`, `crawl_site`, `search_web`, `extract_structured_data`.

## GitHubAdapter

Repository issues, PRs, files, and branches via GitHub REST API.

| Option        | Required | Default            | Purpose                                               |
| ------------- | -------- | ------------------ | ----------------------------------------------------- |
| `token`       | Yes      | None               | GitHub personal access token or fine-grained PAT.     |
| `allowedRepos`| No       | All repos          | Restrict operations to specific `owner/repo` strings. |
| `timeoutMs`   | No       | `15_000`           | Per-request timeout.                                  |

```ts
import { GitHubAdapter } from "@deskcreate/agentcraft/adapters";

agent.use(GitHubAdapter.connect({
  token: process.env.GITHUB_PERSONAL_ACCESS_TOKEN!,
  allowedRepos: ["myorg/myrepo"],
}));
```

**Tools:** `get_repo`, `list_issues`, `create_issue`, `update_issue`, `list_prs`, `get_pr`, `create_pr`, `get_file_content`, `commit_file`, `list_branches`.

## SlackAdapter

Send messages, read channel history, list channels.

| Option            | Required | Default     | Purpose                                      |
| ----------------- | -------- | ----------- | -------------------------------------------- |
| `token`           | Yes      | None        | Slack bot token (`xoxb-...`).                |
| `defaultChannel`  | No       | None        | Pre-select a channel when not specified.     |
| `timeoutMs`       | No       | `10_000`    | Per-request timeout.                         |

```ts
import { SlackAdapter } from "@deskcreate/agentcraft/adapters";

agent.use(SlackAdapter.connect({
  token: process.env.SLACK_BOT_TOKEN!,
  defaultChannel: "engineering-alerts",
}));
```

**Tools:** `send_message`, `send_reply`, `get_channel_history`, `list_channels`, `upload_file`, `add_reaction`.

## DatabaseAdapter

Run queries against a host-owned database with full control over the connection.

| Option     | Required | Default    | Purpose                                                                      |
| ---------- | -------- | ---------- | ---------------------------------------------------------------------------- |
| `execute`  | Yes      | None       | Async function `(sql, params) => rows[]`. You own the connection pool.       |
| `dialect`  | No       | `'generic'`| `'postgres'`, `'mysql'`, `'sqlite'`, or `'generic'`. Adjusts SQL hints.     |
| `readOnly` | No       | `false`    | When `true`, only `execute_query` and `fetch_records` are exposed.           |
| `rowLimit` | No       | `1000`     | Max rows returned per query to prevent unbounded responses.                  |

```ts
import { DatabaseAdapter } from "@deskcreate/agentcraft/adapters";
import { pool } from "./db"; // your existing connection pool

agent.use(DatabaseAdapter.connect({
  execute: (sql, params) => pool.query(sql, params).then(r => r.rows),
  dialect: "postgres",
  readOnly: true,
  rowLimit: 500,
}));
```

**Tools:** `execute_query`, `fetch_records`, `insert_record`, `update_record`, `delete_record`, `list_tables`.

## EmailAdapter

Draft and send emails. Writes are approval-gated by default.

| Option     | Required | Default  | Purpose                                                                   |
| ---------- | -------- | -------- | ------------------------------------------------------------------------- |
| `provider` | Yes      | None     | `'sendgrid'`, `'resend'`, or `'smtp'`.                                    |
| `apiKey`   | For SaaS | None     | API key for SendGrid or Resend.                                           |
| `from`     | No       | None     | Default sender address.                                                   |
| `timeoutMs`| No       | `10_000` | Per-request timeout.                                                      |

```ts
import { EmailAdapter } from "@deskcreate/agentcraft/adapters";

agent.use(EmailAdapter.connect({
  provider: "sendgrid",
  apiKey: process.env.SENDGRID_API_KEY!,
  from: "agent@company.com",
}));
```

**Tools:** `send_email`, `send_template_email`, `list_templates`.

## PlaywrightAdapter

Browser navigation, interaction, screenshots, and text extraction.

| Option           | Required | Default   | Purpose                                                              |
| ---------------- | -------- | --------- | -------------------------------------------------------------------- |
| `launch`         | Yes      | None      | Browser factory function: `() => chromium.launch({ headless: true })`|
| `allowedDomains` | No       | All       | Restrict navigation to these domains.                                |
| `timeoutMs`      | No       | `30_000`  | Navigation/action timeout.                                           |

```ts
import { PlaywrightAdapter } from "@deskcreate/agentcraft/adapters";
import { chromium } from "playwright";

agent.use(PlaywrightAdapter.connect({
  headless: true,
}));
```

**Tools:** `browse_url`, `click_element`, `fill_form`, `take_screenshot`, `extract_text`, `wait_for_selector`.

## GoogleCalendarAdapter

Read and write calendar events and find free/busy slots.

| Option              | Required | Default     | Purpose                                       |
| ------------------- | -------- | ----------- | --------------------------------------------- |
| `accessToken`       | Yes      | None        | Google OAuth2 access token.                   |
| `defaultCalendarId` | No       | `'primary'` | Calendar to use when not specified in a call. |
| `timezone`          | No       | UTC         | Default timezone for event creation.          |

```ts
import { GoogleCalendarAdapter } from "@deskcreate/agentcraft/adapters";

agent.use(GoogleCalendarAdapter.connect({
  accessToken: process.env.GOOGLE_ACCESS_TOKEN!,
  defaultCalendarId: "primary",
  timezone: "America/New_York",
}));
```

**Tools:** `list_events`, `get_event`, `create_event`, `update_event`, `delete_event`, `find_free_slots`.

## GoogleSheetsAdapter

Read and write spreadsheet ranges.

| Option                 | Required | Default   | Purpose                                      |
| ---------------------- | -------- | --------- | -------------------------------------------- |
| `accessToken`          | Yes      | None      | Google OAuth2 access token.                  |
| `defaultSpreadsheetId` | No       | None      | Spreadsheet ID used when not specified.      |

```ts
import { GoogleSheetsAdapter } from "@deskcreate/agentcraft/adapters";

agent.use(GoogleSheetsAdapter.connect({
  accessToken: process.env.GOOGLE_ACCESS_TOKEN!,
  defaultSpreadsheetId: process.env.SHEET_ID,
}));
```

**Tools:** `get_spreadsheet`, `read_range`, `write_range`, `append_row`, `create_sheet`, `list_sheets`.

## ElevenLabsAdapter

Text-to-speech and voice management.

| Option           | Required | Default   | Purpose                                             |
| ---------------- | -------- | --------- | --------------------------------------------------- |
| `apiKey`         | Yes      | None      | ElevenLabs API key.                                 |
| `defaultVoiceId` | No       | None      | Pre-select a voice ID for text-to-speech calls.     |
| `defaultModel`   | No       | None      | Pre-select a model (e.g., `eleven_turbo_v2`).       |

```ts
import { ElevenLabsAdapter } from "@deskcreate/agentcraft/adapters";

agent.use(ElevenLabsAdapter.connect({
  apiKey: process.env.ELEVENLABS_API_KEY!,
  defaultVoiceId: "rachel",
}));
```

**Tools:** `text_to_speech`, `list_voices`, `get_voice`, `clone_voice`.

## Common Patterns

| Pattern                          | Config                                                                    |
| -------------------------------- | ------------------------------------------------------------------------- |
| Read-only source files           | `FileSystemAdapter.connect({ rootPath: "./src", readOnly: true })`        |
| Domain-restricted web fetch      | `FetchAdapter.connect({ allowedDomains: ["docs.example.com"] })`          |
| Approval-gated file writes       | `toolPolicy: { requireConfirmation: ["write_file"] }`                     |
| Rate-limited web search          | `budget: { maxToolCalls: 5 }` + `TavilySearchAdapter.connect(...)`        |
| Audit-logged GitHub reads        | `GitHubAdapter.connect({ allowedRepos: [...] })` + `traceSink: collector` |
| Approval-gated email send        | `toolPolicy: { requireConfirmation: ["send_email"] }`                     |

## Attaching Multiple Adapters

Each `.use()` call is chained — attach as many adapters as needed:

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import {
  TavilySearchAdapter,
  FileSystemAdapter,
  GitHubAdapter,
} from "@deskcreate/agentcraft/adapters";

const agent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
  toolPolicy: {
    readOnly: false,
    requireConfirmation: ["write_file", "commit_file"],
    maxResultBytes: 40_000,
  },
})
  .use(TavilySearchAdapter.connect({ apiKey: process.env.TAVILY_API_KEY! }))
  .use(FileSystemAdapter.connect({ rootPath: "./content", allowedExtensions: [".md"] }))
  .use(GitHubAdapter.connect({ token: process.env.GITHUB_PERSONAL_ACCESS_TOKEN!, allowedRepos: ["myorg/docs"] }));
```

For the full adapter catalog with all tools and configs, see [Built-In Adapters Reference](../reference/built-in-adapters.md).

More patterns: [tools and adapters cookbook](../examples-cookbook/tools-adapters.md).
