import { Agent, Provider } from "agentcraft";
import { DatabaseAdapter } from "agentcraft/adapters";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(
  DatabaseAdapter.connect({
    // connectionString is required unless you inject a custom query executor.
    // Use a read-only database user in production.
    connectionString: process.env.DATABASE_URL!,
    // dialect is optional. Supported values: 'postgres' (default), 'mysql', 'sqlite'.
    // It controls placeholder syntax and some generated SQL behavior.
    dialect: "postgres",
    // readOnly defaults to true. Keep it true for analytics/inspection agents.
    // Set false only with approvals and a write-capable DB user.
    readOnly: true,
    // rowLimit is optional. It caps returned rows and helps control cost/context size.
    rowLimit: 100,
    // timeoutMs is optional and in milliseconds. Use it to avoid runaway queries.
    timeoutMs: 5_000,
  }),
);

const response = await agent.run({
  prompt: "Inspect the schema and suggest three useful analytics questions.",
  toolPolicy: {
    // Defense in depth: adapter is read-only and policy is read-only.
    readOnly: true,
  },
});

console.log(response.content);
