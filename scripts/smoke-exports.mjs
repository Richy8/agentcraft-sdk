import assert from 'node:assert/strict';

const root = await import('../dist/index.js');
const adapters = await import('../dist/adapters.js');
const mcp = await import('../dist/mcp.js');
const team = await import('../dist/team.js');

assert.equal(typeof root.Agent, 'function');
assert.equal(typeof root.AgentPool, 'function');
assert.equal(typeof root.Provider, 'object');
assert.equal(typeof root.FileSystemCreatorMemoryStore, 'function');
assert.equal(typeof root.FileSystemAnalyticsHistoryStore, 'function');
assert.equal(typeof adapters.FileSystemAdapter, 'function');
assert.equal(typeof adapters.tool, 'function');
assert.equal(typeof mcp.GitHubMCP, 'object');
assert.equal(typeof team.AgentTeam, 'function');

console.log('agentcraft export smoke test passed');
