/**
 * Skills + MCP + Memory — a composable agent
 *
 * Demonstrates:
 *  - Skill.define() for injecting tone/format constraints (Level 1 + Level 2)
 *  - FilesystemMCP for scoped local file access
 *  - AgentMemory for cross-run fact persistence
 *  - MCP.connect() generic factory for a custom stdio MCP server
 */

import { Agent, AgentMemory, Provider } from "@deskcreate/agentcraft";
import { Skill } from "@deskcreate/agentcraft/skills";
import { FetchAdapter } from "@deskcreate/agentcraft/adapters";
import { FilesystemMCP, MCP } from "@deskcreate/agentcraft/mcp";

// ---------------------------------------------------------------------------
// Define a skill — injected as Level 1 (system prompt) + Level 2 (tool)
// ---------------------------------------------------------------------------

const releaseWriter = Skill.define({
  name: "release-writer",
  description:
    "Drafts concise, customer-visible release notes. Each note has a headline, one-sentence impact, and a callout for breaking changes.",
  instructions: `
## Release Note Contract

Structure every note as:
  1. **Headline** — verb + noun, present tense (e.g. "Adds streaming support for tool calls")
  2. **Impact** — one sentence: who benefits and how
  3. **Breaking?** — "None" or a short description of what callers must update

Rules:
  - Maximum 80 words
  - No marketing language ("game-changing", "revolutionary")
  - Active voice
  - End with: <!-- end -->
  `.trim(),
  files: {
    "tone-guide.txt": `
Audience: developers reading a changelog
Voice: direct, precise, no fluff
Good: "Reduces cold-start latency by 40% by pre-warming the provider pool."
Bad: "We are excited to announce major performance improvements!"
    `.trim(),
  },
});

// ---------------------------------------------------------------------------
// Semantic memory — persists facts across agent runs
// ---------------------------------------------------------------------------

const memory = AgentMemory.local();

// ---------------------------------------------------------------------------
// Agent — skill + filesystem MCP + fetch + memory
// ---------------------------------------------------------------------------

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  memory,
})
  .use(releaseWriter)
  .use(
    // FilesystemMCP gives the agent scoped read access to local files
    FilesystemMCP.connect({
      allowedPaths: ["./CHANGELOG.md"],
      allowedTools: ["read_file"],
    }),
  )
  .use(
    // FetchAdapter for trusted external reads
    FetchAdapter.connect({
      allowedDomains: ["docs.example.com"],
    }),
  );

// ---------------------------------------------------------------------------
// Run 1 — store a project fact in memory
// ---------------------------------------------------------------------------

await agent.run({
  prompt:
    "Remember: our product is called AgentCraft and our primary users are backend engineers.",
  budget: { maxToolCalls: 1 },
});

// ---------------------------------------------------------------------------
// Run 2 — draft a release note using the skill and remembered context
// ---------------------------------------------------------------------------

const response = await agent.run({
  prompt:
    "Draft a release note for the new Skill.fromGitHub() feature that lets agents load skills from any public GitHub repo.",
  budget: { maxToolCalls: 3 },
});

console.log(response.content);

// ---------------------------------------------------------------------------
// Generic MCP.connect() — connect any stdio MCP package
// ---------------------------------------------------------------------------

const genericAgent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(
  MCP.connect({
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-filesystem@0.6.2", "./docs"],
    allowedTools: ["read_file", "list_directory"],
  }),
);

const docsResponse = await genericAgent.run({
  prompt: "List the top-level files in the docs directory.",
  budget: { maxToolCalls: 2 },
});

console.log(docsResponse.content);
