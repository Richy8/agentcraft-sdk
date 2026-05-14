import { Agent, Provider } from "agentcraft";
import { FetchAdapter, TavilySearchAdapter } from "agentcraft/adapters";
import { MemoryMCP } from "agentcraft/mcp";
import { MemorySkill, ResearchSkill } from "agentcraft/skills";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
})
  // MemoryMCP is a built-in MCP wrapper. It launches the official memory server
  // through stdio and exposes memory tools to the agent.
  // filePath is optional. Provide it when you want memory stored in a predictable
  // local file for demos or small internal workflows.
  .use(MemoryMCP.connect({ filePath: "./.agentcraft-memory.json" }))
  // MemorySkill gives the model rules for when to store, recall, and update memory.
  // It depends on a memory-capable adapter such as MemoryMCP, Redis, Pinecone, or Supabase.
  .use(MemorySkill.create())
  // FetchAdapter is a native adapter, not MCP. It lets the same agent fetch
  // trusted web pages while the memory skill handles continuity across runs.
  .use(FetchAdapter.connect({ allowedDomains: ["docs.example.com"] }))
  // ResearchSkill requires a search/retrieval adapter. Tavily is the compact
  // web-search path; Firecrawl can be swapped in when crawl depth matters more.
  .use(TavilySearchAdapter.connect({ apiKey: process.env.TAVILY_API_KEY! }))
  .use(ResearchSkill.create());

await agent.run({
  prompt:
    "Remember that our preferred release-note tone is concise, customer-visible, and practical.",
  toolPolicy: {
    timeoutMs: 8_000,
    // readOnly false allows the memory server to write/update memory. Keep this
    // true for analysis-only agents and false only when persistence is intended.
    readOnly: false,
  },
  budget: {
    maxToolCalls: 2,
  },
});

const response = await agent.run({
  prompt:
    "Using the remembered release-note tone, research https://docs.example.com/changelog and draft a short release summary.",
  toolPolicy: {
    timeoutMs: 12_000,
    readOnly: false,
  },
  budget: {
    maxToolCalls: 6,
  },
});

console.log(response.content);
