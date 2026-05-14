import assert from 'node:assert/strict';

const root = await import('../dist/index.js');
const adapters = await import('../dist/adapters.js');
const skills = await import('../dist/skills.js');
const packs = await import('../dist/packs.js');
const mcp = await import('../dist/mcp.js');
const team = await import('../dist/team.js');

assert.equal(typeof root.Agent, 'function');
assert.equal(typeof root.AgentPool, 'function');
assert.equal(typeof root.Provider, 'object');
assert.equal(typeof root.FileSystemCreatorMemoryStore, 'function');
assert.equal(typeof root.FileSystemAnalyticsHistoryStore, 'function');
assert.equal(typeof adapters.FileSystemAdapter, 'function');
assert.equal(typeof adapters.tool, 'function');
assert.equal(typeof skills.ResearchSkill, 'function');
assert.equal(typeof skills.GitHubSkillLoader, 'object');
assert.equal(typeof packs.CreatorPacks, 'object');
assert.equal(typeof mcp.GitHubMCP, 'object');
assert.equal(typeof team.AgentTeam, 'function');

console.log('agentcraft export smoke test passed');
