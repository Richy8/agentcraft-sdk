# Environment Variables

AgentCraft does not require environment variables for mocked unit tests, but live providers, adapters, and MCP servers need credentials.

## Common Variables

| Variable            | Required for       | Default | Purpose                     |
| ------------------- | ------------------ | ------- | --------------------------- |
| `OPENAI_API_KEY`    | OpenAI provider    | None    | Model calls.                |
| `ANTHROPIC_API_KEY` | Anthropic provider | None    | Model calls.                |
| `GOOGLE_API_KEY`    | Google provider    | None    | Model calls.                |
| `INTEGRATION_TESTS` | Live tests         | `false` | Enables integration suites. |

## Tool Variables

| Variable                       | Required for          | Default | Purpose                                 |
| ------------------------------ | --------------------- | ------- | --------------------------------------- |
| `GITHUB_PERSONAL_ACCESS_TOKEN` | GitHub adapter/MCP    | None    | Repo reads/writes based on token scope. |
| `FIRECRAWL_API_KEY`            | Firecrawl adapter/MCP | None    | Scrape, crawl, search.                  |
| `APIFY_TOKEN`                  | Apify adapter/MCP     | None    | Actors and datasets.                    |
| `TAVILY_API_KEY`               | Tavily adapter        | None    | Search and extraction.                  |

## Usage

```bash
cp .env.example .env
npm run test:int:light
```

Keep write gates off unless you are deliberately testing writes:

```bash
AGENTCRAFT_LIVE_ALLOW_WRITES=false
INTEGRATION_TESTS=true
```

More variables are listed in the repo root `.env.example` file and [live testing](../examples-cookbook/production.md).
