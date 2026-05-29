# Environment Variables

AgentCraft reads credentials and feature flags from environment variables. Unit tests (with `DeterministicFakeProvider`) require no variables. Live integration tests and production agents need the variables listed here.

## Provider API Keys

| Variable              | Required for                     | Purpose                                      |
| --------------------- | -------------------------------- | -------------------------------------------- |
| `OPENAI_API_KEY`      | OpenAI provider                  | Model calls using `Provider.openai[...]`.    |
| `ANTHROPIC_API_KEY`   | Anthropic provider               | Model calls using `Provider.anthropic[...]`. |
| `GOOGLE_API_KEY`      | Google Gemini provider           | Model calls using `Provider.google[...]`.    |
| `GROQ_API_KEY`        | Groq provider                    | Model calls using `Provider.groq[...]`.      |
| `COHERE_API_KEY`      | Cohere provider                  | Model calls using `Provider.cohere[...]`.    |
| `TOGETHER_API_KEY`    | OpenAI-compatible endpoint       | Pass as `apiKey` with a custom `baseUrl`.    |

## Adapter Credentials

| Variable                       | Required for           | Purpose                                                    |
| ------------------------------ | ---------------------- | ---------------------------------------------------------- |
| `GITHUB_PERSONAL_ACCESS_TOKEN` | GitHub adapter/MCP     | Repo reads/writes — scope to minimum required permissions. |
| `TAVILY_API_KEY`               | TavilySearchAdapter    | Web search and page content extraction.                    |
| `FIRECRAWL_API_KEY`            | FirecrawlMCP           | Scrape, crawl, search, structured extraction.              |
| `SLACK_BOT_TOKEN`              | SlackMCP               | Send and read Slack messages.                              |
| `SLACK_TEAM_ID`                | SlackMCP               | Required by the Slack MCP server.                          |
| `BRAVE_API_KEY`                | BraveSearchMCP         | Brave Search MCP server.                                   |

## Storage And Memory Credentials

| Variable                          | Required for                   | Purpose                                                    |
| --------------------------------- | ------------------------------ | ---------------------------------------------------------- |
| `AGENTCRAFT_LIVE_REDIS_URL`       | Redis cache live tests         | Redis URL for distributed cache (`AgentCache.redis(...)`). |
| `AGENTCRAFT_LIVE_POSTGRES_URL`    | Postgres cache live tests      | Postgres URL for `AgentCache.postgres(...)`.               |
| `AGENTCRAFT_LIVE_SUPABASE_DB_URL` | Supabase Postgres cache        | Direct Postgres URL for Supabase-backed cache.             |
| `AGENTCRAFT_LIVE_QDRANT_URL`      | Qdrant vector memory           | Qdrant endpoint for `AgentMemory.vector({ provider: "qdrant" })`. |
| `AGENTCRAFT_LIVE_PINECONE_URL`    | Pinecone vector memory         | Pinecone index host for `AgentMemory.vector({ provider: "pinecone" })`. |
| `AGENTCRAFT_LIVE_SUPABASE_URL`    | Supabase vector memory         | Supabase project URL for pgvector memory.                  |
| `QDRANT_API_KEY`                  | Qdrant (production)            | API key when using authenticated Qdrant Cloud.             |
| `PINECONE_API_KEY`                | Pinecone (production)          | Pinecone API key for production vector index.              |
| `SUPABASE_ACCESS_TOKEN`           | SupabaseMcp                    | Supabase management API access token.                      |
| `SUPABASE_PROJECT_REF`            | SupabaseMcp                    | Supabase project reference ID.                             |

## MCP Server Credentials

| Variable                       | Required for     | Purpose                                      |
| ------------------------------ | ---------------- | -------------------------------------------- |
| `LINEAR_API_KEY`               | LinearMcp        | Linear project management MCP server.        |
| `JIRA_EMAIL`                   | JiraMcp          | Jira authentication email address.           |
| `JIRA_API_TOKEN`               | JiraMcp          | Jira API token.                              |
| `JIRA_BASE_URL`                | JiraMcp          | Jira instance URL (e.g., `company.atlassian.net`). |
| `SENTRY_AUTH_TOKEN`            | SentryMcp        | Sentry event and project access.             |
| `BROWSERBASE_API_KEY`          | BrowserbaseMcp   | Browserbase cloud browser key.               |
| `BROWSERBASE_PROJECT_ID`       | BrowserbaseMcp   | Browserbase project ID.                      |
| `AIRTABLE_API_KEY`             | AirtableMcp      | Airtable personal access token.              |
| `AIRTABLE_BASE_ID`             | AirtableMcp      | Airtable base ID.                            |
| `DATABASE_URL`                 | PostgresMcp      | Postgres connection string.                  |
| `CLOUDFLARE_API_TOKEN`         | CloudflareMcp    | Cloudflare API token.                        |
| `CLOUDFLARE_ACCOUNT_ID`        | CloudflareMcp    | Cloudflare account ID.                       |
| `RAILWAY_API_TOKEN`            | RailwayMcp       | Railway deployment API token.                |
| `RENDER_API_KEY`               | RenderMcp        | Render deployment API key.                   |
| `STRIPE_SECRET_KEY`            | StripeMcp        | Stripe payments MCP server.                  |
| `FIGMA_API_KEY`                | FigmaMcp         | Figma design file read access.               |

## Test And Feature Flags

| Variable                          | Default   | Purpose                                                             |
| --------------------------------- | --------- | ------------------------------------------------------------------- |
| `INTEGRATION_TESTS`               | `false`   | Set to `true` to run live provider integration tests.               |
| `AGENTCRAFT_LIVE_EVALS`           | `false`   | Enables light eval/report smoke tests.                              |
| `AGENTCRAFT_LIVE_SEMANTIC_MEMORY` | `false`   | Enables vector memory provider certification tests.                 |
| `AGENTCRAFT_LIVE_ALLOW_WRITES`    | `false`   | Opt in to write-path integration tests.                             |

## .env Setup

Copy `.env.example` from the repo root and fill in the keys you need:

```bash
cp .env.example .env
```

Minimal `.env` for OpenAI + web search + GitHub reads:

```bash
# Provider
OPENAI_API_KEY=sk-...

# Adapters
TAVILY_API_KEY=tvly-...
GITHUB_PERSONAL_ACCESS_TOKEN=ghp_...

# Integration tests (optional)
INTEGRATION_TESTS=false
AGENTCRAFT_LIVE_ALLOW_WRITES=false
```

Minimal `.env` for Anthropic + file cache + Redis distributed cache:

```bash
# Provider
ANTHROPIC_API_KEY=sk-ant-...

# Distributed cache (optional — falls back to file cache)
AGENTCRAFT_LIVE_REDIS_URL=redis://localhost:6379
```

## Running Live Tests

Light integration suite (OpenAI only, no writes):

```bash
INTEGRATION_TESTS=true npm run test:int:light
```

Full integration suite (all providers, read-only):

```bash
INTEGRATION_TESTS=true npm run test:int
```

Full suite with write paths enabled:

```bash
INTEGRATION_TESTS=true AGENTCRAFT_LIVE_ALLOW_WRITES=true npm run test:int
```

Keep `AGENTCRAFT_LIVE_ALLOW_WRITES=false` in CI unless you deliberately test write paths in an isolated environment.

## Security Notes

- Never hardcode API keys in source files — always use `process.env.KEY_NAME!`.
- Add `.env` to `.gitignore` (the repo root already does this).
- Use different API keys for development, staging, and production.
- Rotate keys immediately if you suspect exposure — MCP server credentials are especially sensitive because they carry broad repo/DB/cloud permissions.
- Fine-grained PATs for GitHub are preferred over classic tokens — scope them to only the repos and permissions you need.
