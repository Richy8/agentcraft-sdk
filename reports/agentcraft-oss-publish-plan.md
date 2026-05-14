# AgentCraft — OSS & npm Publish Preparation Plan

**Goal:** Take the AgentCraft package from internal development state to a publicly releasable open-source npm package, with the community infrastructure, documentation, and automation a real contributor ecosystem needs.

**Current state snapshot (2026-05-14):**

- MIT license declared in `package.json` but no `LICENSE` file at root.
- `npm pack --dry-run` reveals the published tarball would include `.claude/settings.json`, `.cursor/mcp.json`, `CLAUDE.md`, `GEMINI.md`, `AGENTS.md`, `SYSTEM_PROMPT.md`, `.agentcraft/live-skills-cache/`, the entire `docs/.vitepress/.temp/` build cache, and hundreds of other internal files. No `files` field is set.
- `package.json` is missing `description`, `keywords`, `author`, `repository`, `homepage`, and `bugs` — the npm page would show no source link, no issue tracker, and no search tags.
- No `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, GitHub issue templates, or PR template.
- CI runs only on Node 20 and only runs `release:check`. No publish workflow exists.
- `CHANGELOG.md` only documents the initial 0.1.0 foundation. All Phase 1–6 primitives (AgentWorkflow, AgentWorkspace, ArtifactStore, ArtifactRegistry, AgentCache.memory, AgentEventEmitter, workspace events, resume, rolePolicies) are unrecorded.
- `README.md` guide links point to local `./docs/` paths (broken on npm), has no badges, and does not mention any of the new primitives.

---

## Phase 1 — Fix the npm Package Boundary and Git Hygiene

**Why first:** Without a `files` allowlist, every `npm publish` ships internal tooling, AI scaffolding, docs build artifacts, and potentially secret fixtures to every consumer. This is the only blocking issue. `.gitignore` gaps also allow generated artifacts to be accidentally committed.

### Two separate concerns

`files` in `package.json` is an **allowlist** — anything not listed is excluded from npm automatically. `.gitignore` is separate — for files that should never enter the git history at all.

### npm: What ships to consumers (`files` allowlist)

`files` is already set to:

```json
"files": [
  "dist",
  "README.md",
  "CHANGELOG.md",
  "LICENSE"
]
```

Everything else is blocked from npm automatically: `src/`, `docs/`, `examples/`, `scripts/`, `reports/`, `.github/`, `CLAUDE.md`, `GEMINI.md`, `AGENTS.md`, `SYSTEM_PROMPT.md`, `Makefile`, `setup-ai-dev.sh`, `.env.example`, `.mcp.json`, `.opencode.json`, `.cursorrules`, `.windsurfrules`, `tsconfig.json`, `vitest.config.ts`, `typedoc.json`, `package-lock.json`.

### git: What stays in the repo

These files are appropriate to commit — they help contributors using the same tooling and contain no secrets:

| File / Directory                      | Reason to keep in git                          |
| ------------------------------------- | ---------------------------------------------- |
| `CLAUDE.md`, `AGENTS.md`, `GEMINI.md` | AI tool instructions for contributors          |
| `SYSTEM_PROMPT.md`                    | AI system prompt, not sensitive                |
| `.cursorrules`, `.windsurfrules`      | IDE rules for contributors                     |
| `.mcp.json`, `.opencode.json`         | MCP and IDE config for contributors            |
| `Makefile`, `setup-ai-dev.sh`         | Dev tooling helpers                            |
| `reports/`                            | Internal planning docs                         |
| `docs/`, `examples/`, `scripts/`      | Source for docs site and contributor reference |
| `.env.example`                        | Template contributors fill in locally          |
| `.github/`                            | CI workflows, issue templates, PR template     |

### git: What must NOT be committed (`.gitignore`)

These are already added to `.gitignore`:

| Entry                 | Why                                                           |
| --------------------- | ------------------------------------------------------------- |
| `graphify-out/`       | Generated knowledge graph, rebuilt via `npm run graph:update` |
| `.agentcraft/`        | Live integration test cache written during test runs          |
| `test-ws/`            | Temporary workspace directory created during workspace tests  |
| `dist/`               | Build output                                                  |
| `.env`                | Secrets                                                       |
| `.code-review-graph/` | Code review graph state                                       |

### Checklist

- [x] Add `files` field to `package.json` with the allowlist above.
- [x] Add `graphify-out/`, `.agentcraft/`, `test-ws/` to `.gitignore`.
- [x] Run `npm pack --dry-run` and verify the tarball contains **only** `dist/`, `README.md`, `CHANGELOG.md`, `LICENSE`, and `package.json`. No internal files should appear.
- [x] Confirm `npm run package:size` still passes (it measures `dist/` only — unaffected by `files`).
- [ ] Manual git-history check after restoring `.git`: verify `.env` has never been committed with `git log --all --full-history -- .env`. This workspace does not include a `.git` directory, so the local command cannot be completed here.
- [ ] Manual git-index check after restoring `.git`: verify `graphify-out/` and `.agentcraft/` are not tracked with `git ls-files graphify-out .agentcraft`. This workspace does not include a `.git` directory, so the local command cannot be completed here.

### Completion Criteria

`npm pack --dry-run` output contains exactly `package.json`, `README.md`, `CHANGELOG.md`, `LICENSE`, and the contents of `dist/`. No internal files appear.

---

## Phase 2 — package.json Metadata

**Why:** The npm registry page is the first thing a potential user sees. Missing fields produce a blank, unlinkable page with no GitHub link, no search discoverability, and no issue tracker pointer.

### Checklist

- [x] Add `"description"` — one sentence, matches the first line of the README:
  ```json
  "description": "Production-grade TypeScript agent runtime with provider routing, tools, MCP, skills, workflows, structured output, streaming, budgets, and observability."
  ```
- [x] Add `"keywords"` covering the primary discovery terms:
  ```json
  "keywords": [
    "ai", "agent", "llm", "openai", "anthropic", "claude", "gemini",
    "mcp", "tool-use", "workflow", "typescript", "structured-output",
    "streaming", "multi-agent"
  ]
  ```
- [x] Add `"author"` with name and optional URL.
- [x] Add `"repository"` pointing to the GitHub repo once the org/repo name is decided:
  ```json
  "repository": {
    "type": "git",
    "url": "https://github.com/<org>/agentcraft.git"
  }
  ```
- [x] Add `"homepage"` pointing to the public docs site URL.
- [x] Add `"bugs"` pointing to GitHub issues:
  ```json
  "bugs": {
    "url": "https://github.com/<org>/agentcraft/issues"
  }
  ```
- [x] Run `npm pack --dry-run` again to verify `package.json` in the tarball has all new fields.

### Completion Criteria

`npm view agentcraft` (after a `npm publish --dry-run`) shows description, keywords, repository link, homepage, and bugs URL.

---

## Phase 3 — LICENSE File

**Why:** `package.json` declares `"license": "MIT"` but there is no `LICENSE` file at the repo root. GitHub shows a "License: MIT" badge only when a `LICENSE` file is present and parseable. Without it, consumers cannot verify the license terms, and GitHub Dependabot and legal tooling will not recognize the project as MIT-licensed.

### Checklist

- [x] Create `LICENSE` at the project root with the standard MIT text, substituting the correct copyright holder name and year:

  ```
  MIT License

  Copyright (c) 2026 <Your Name or Organization>

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in all
  copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.
  ```

- [x] Verify `LICENSE` is included in the `npm pack --dry-run` output (it is auto-included by npm alongside `README.md` and `package.json`).
- [ ] Manual GitHub check after push: verify GitHub detects the license automatically (Settings → Code and automation → License).

### Completion Criteria

GitHub shows the MIT badge on the repo page. `LICENSE` appears in the npm tarball.

---

## Phase 4 — Community Health Files

**Why:** GitHub marks repositories with missing community files as "incomplete" in the community health checklist. Contributors don't know how to run the project, report bugs privately, or open a compliant PR. A missing code of conduct signals the project is not ready for external participation.

### Checklist

#### `CONTRIBUTING.md`

- [x] Create `CONTRIBUTING.md` at the repo root. Include:
  - **Prerequisites**: Node ≥ 20, `npm ci`
  - **Run unit tests**: `npm test` (no API keys required)
  - **Run typecheck**: `npm run typecheck`
  - **Run the full release gate**: `npm run release:check`
  - **Live integration tests**: explain the `INTEGRATION_TESTS=true` flag, note they cost money, point to `.env.example`
  - **Coding conventions**: static factory pattern (`Foo.create()`, no `new`), no comments on obvious code, four-column config tables in docs, `ts` code blocks not `typescript`
  - **PR process**: fork → branch → `npm run release:check` → open PR against `main`
  - **Commit style**: present-tense imperative ("Add", "Fix", "Remove"), not past tense
  - **Where to ask questions**: link to GitHub Discussions (once enabled)

#### `CODE_OF_CONDUCT.md`

- [x] Create `CODE_OF_CONDUCT.md` using the [Contributor Covenant 2.1](https://www.contributor-covenant.org/version/2/1/code_of_conduct/) template.
- [x] Fill in the enforcement contact email (project maintainer email).

#### `SECURITY.md`

- [x] Create `SECURITY.md`. Include:
  - **Supported versions**: table of which versions receive security fixes (e.g., latest `0.x` only at this stage)
  - **Reporting a vulnerability**: instruct reporters to use GitHub's private vulnerability reporting (Security → Report a vulnerability) rather than opening a public issue
  - **Response timeline**: acknowledge within 2 business days, patch timeline target
  - **Out of scope**: what does NOT count as a security report (e.g., pricing estimator accuracy)

#### GitHub Issue Templates

- [x] Create `.github/ISSUE_TEMPLATE/bug_report.yml` with fields: description, reproduction steps, expected behavior, actual behavior, AgentCraft version, Node version, provider used.
- [x] Create `.github/ISSUE_TEMPLATE/feature_request.yml` with fields: problem statement, proposed solution, alternatives considered.
- [x] Create `.github/ISSUE_TEMPLATE/config.yml` to disable blank issues and link to Discussions for questions.

#### PR Template

- [x] Create `.github/PULL_REQUEST_TEMPLATE.md` with sections: Summary, Type of change (bug fix / new feature / docs / refactor), Checklist (`npm run release:check` passes, tests added, docs updated if needed).

### Completion Criteria

GitHub community health page (Insights → Community Standards) shows all items as complete: Description, README, Code of conduct, Contributing, License, Security policy, Issue templates.

---

## Phase 5 — README and CHANGELOG

**Why:** The README is the package landing page on npm and GitHub. It currently has no badges, broken local-path guide links, and does not mention any of the Phase 1–6 primitives. The CHANGELOG has not been updated since the initial 0.1.0 commit.

### Checklist

#### README

- [x] Add a badges row near the top (below the title, above the quickstart):
  ```md
  [![npm version](https://img.shields.io/npm/v/agentcraft)](https://www.npmjs.com/package/agentcraft)
  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
  [![CI](https://github.com/<org>/agentcraft/actions/workflows/ci.yml/badge.svg)](https://github.com/<org>/agentcraft/actions/workflows/ci.yml)
  [![Node ≥ 20](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)
  ```
- [x] Add the new primitives to the "Core Ideas" bullet list:
  - `AgentWorkflow` — repeatable step graphs with retries, approvals, branches, parallel fan-out, Zod-validated input, and resumable failed runs.
  - `AgentWorkspace` — shared runtime context wiring cache, adapters, tool policy, budget, events, and artifact store once for teams and workflows.
  - `ArtifactStore` — typed durable persistence with `MemoryArtifactStore`, `FileArtifactStore`, and `SQLiteArtifactStore` backends.
  - `ArtifactRegistry` — named Zod schema registry for 19 built-in creator artifact types with custom extension support.
- [x] Fix guide links — replace all `./docs/...` local paths with absolute URLs pointing to the public docs site (e.g., `https://<docs-url>/guides/...`). Local paths are broken on npm and on GitHub for users who have not cloned the repo.
- [x] Add a brief "Community" section at the bottom linking to CONTRIBUTING.md, CODE_OF_CONDUCT.md, and GitHub Discussions.
- [x] Update the install command section (or add one if missing):
  ```sh
  npm install agentcraft
  ```

#### CHANGELOG

- [x] Add a new release entry for the primitives built in Phase 1–6. Use the version decided in Phase 7 (e.g., `0.2.0`). Include:
  - **AgentWorkflow** — `AgentWorkflow.create()`, seven step factories (`AgentStep`, `TeamStep`, `ToolStep`, `ApprovalStep`, `ConditionStep`, `ParallelStep`, `CustomStep`), Zod-validated input, retry, `workflow.resume()`, `WorkflowRun` artifact persistence.
  - **AgentWorkspace** — `AgentWorkspace.create()`, `memory()`, `local()`, shared cache, adapters, MCPs, tool policy, budget, trace sink, store, and typed event emitter.
  - **AgentEventEmitter** — 11 typed events: `cache.hit`, `cache.miss`, `cost.updated`, `tool.called`, `approval.requested/granted/denied`, `workflow.step.started/completed`, `artifact.read/write`.
  - **ArtifactStore** — `MemoryArtifactStore`, `FileArtifactStore`, `SQLiteArtifactStore` (optional peer: `better-sqlite3`), `ArtifactFilter`, `ArtifactHistory`, `link()`.
  - **ArtifactRegistry** — 19 pre-registered creator artifact schemas, `register`, `lookup`, `list`, `deregister`.
  - **AgentCache.memory()** — in-process cache driver with TTL and max-entry-bytes options.
  - **AgentTeam** — `workspace` and `rolePolicies` fields; `sharedAdapters` and `memory` deprecated when workspace is provided.
  - **New creator artifact schemas** — `BrandVoiceProfile`, `ContentPillars`, `PersonaProfile`, `MediaBrief`, `PublishingStatus`.

### Completion Criteria

- `README.md` badges render correctly (test in a GitHub Markdown preview).
- All guide links are absolute URLs that open correctly without a local clone.
- `CHANGELOG.md` has a dated entry for every new feature in Phase 1–6.

---

## Phase 6 — CI and Release Automation

**Why:** CI currently tests only Node 20 on a single job with no publish automation. Contributors on Node 22 will encounter silent breakages. npm releases would require manual `npm publish` commands — error-prone and unauditable.

### Checklist

#### CI — Node Version Matrix

- [x] Update `.github/workflows/ci.yml` to test on Node 20 and Node 22:
  ```yaml
  strategy:
    matrix:
      node-version: [20, 22]
  steps:
    - uses: actions/setup-node@v4
      with:
        node-version: ${{ matrix.node-version }}
        cache: npm
  ```

#### Publish Workflow

- [x] Create `.github/workflows/publish.yml` triggered on GitHub Release published:

  ```yaml
  name: Publish

  on:
    release:
      types: [published]

  jobs:
    publish:
      name: npm Publish
      runs-on: ubuntu-latest
      permissions:
        contents: read
        id-token: write # required for --provenance

      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
          with:
            node-version: 20
            registry-url: https://registry.npmjs.org
            cache: npm
        - run: npm ci
        - run: npm run release:check
        - run: npm publish --provenance --access public
          env:
            NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
  ```

- [ ] Manual GitHub secret setup: add `NPM_TOKEN` to the repository (Settings → Secrets → Actions). Use a granular npm access token scoped to the `agentcraft` package only.
- [ ] Manual GitHub workflow test: publish a pre-release tag after push and confirm `publish.yml` completes the `npm run release:check` step before the real release.

#### Dependabot

- [x] Create `.github/dependabot.yml`:
  ```yaml
  version: 2
  updates:
    - package-ecosystem: npm
      directory: /
      schedule:
        interval: weekly
      open-pull-requests-limit: 5
    - package-ecosystem: github-actions
      directory: /
      schedule:
        interval: weekly
  ```

### Completion Criteria

- CI matrix shows two passing jobs (Node 20, Node 22) on every PR.
- A test pre-release triggers `publish.yml` and completes the `npm run release:check` step without error.
- Dependabot config appears in repository settings.

---

## Phase 7 — Pre-Publish Smoke Test and Version Decision

**Why:** Before the first public release, verify the package installs and resolves correctly from a clean context — not just from the local monorepo. This is the final gate.

### Checklist

#### Version Decision

- [x] Decide whether the Phase 1–6 primitives constitute a **minor** bump (`0.1.0 → 0.2.0`) or a pre-release tag (`0.2.0-alpha.1`). Recommendation: `0.2.0` if the API is considered stable; `0.2.0-alpha.1` if `CachePolicy` enforcement and other incomplete features need a disclaimer.
- [x] Update `package.json` `"version"` accordingly.
- [x] Update `CHANGELOG.md` entry date to match the release date.

#### Pack Dry Run

- [x] Run `npm run build` to produce a fresh `dist/`.
- [x] Run `npm pack --dry-run` and manually review the tarball file list one final time. Expected contents: `package.json`, `README.md`, `CHANGELOG.md`, `LICENSE`, and all files under `dist/`.
- [x] Confirm `dist/` contains: `index.js`, `index.d.ts`, `adapters.js`, `adapters.d.ts`, `skills.js`, `skills.d.ts`, `packs.js`, `packs.d.ts`, `mcp.js`, `mcp.d.ts`, `team.js`, `team.d.ts`, plus all supporting `.js`, `.d.ts`, and `.js.map` files.

#### Clean-Install Verification

- [x] Create a temporary directory outside this repo.
- [x] Run `npm pack` in the agentcraft root to produce `agentcraft-<version>.tgz`.
- [x] In the temp directory, run `npm install /path/to/agentcraft-<version>.tgz`.
- [x] Write a minimal TypeScript file that imports from each export path and verify `tsc` resolves types without error:
  ```ts
  import {
    Agent,
    AgentWorkflow,
    AgentWorkspace,
    ArtifactRegistry,
  } from "agentcraft";
  import { FileSystemAdapter } from "agentcraft/adapters";
  import { AgentTeam } from "agentcraft/team";
  ```
- [x] Run `node -e "import('agentcraft').then(m => console.log(Object.keys(m).length))"` and verify a non-zero key count.
- [x] Clean up the temp directory.

#### Export Smoke

- [x] Run `npm run exports:smoke` from the agentcraft root to confirm all declared export paths resolve.

#### Final Release Gate

- [x] Run `npm run release:check` one last time. All steps must pass:
  - `typecheck`
  - `test`
  - `build`
  - `examples:check`
  - `examples:typecheck`
  - `exports:smoke`
  - `package:size`
  - `docs:build`
  - `format:check`
  - `audit:ci`

### Completion Criteria

- `npm run release:check` exits 0.
- Clean-install verification produces no TypeScript errors and the runtime import returns exported names.
- `npm pack --dry-run` shows only the allowlisted files.
- Version is set and CHANGELOG is dated.

---

## Phase Order Summary

| Phase | Title                     | Blocks publish? | Effort  |
| ----- | ------------------------- | --------------- | ------- |
| 1     | npm Package Boundary      | **Yes**         | 30 min  |
| 2     | package.json Metadata     | No (but urgent) | 30 min  |
| 3     | LICENSE File              | No (but urgent) | 15 min  |
| 4     | Community Health Files    | No              | 2–3 hrs |
| 5     | README and CHANGELOG      | No              | 1–2 hrs |
| 6     | CI and Release Automation | No              | 1–2 hrs |
| 7     | Pre-Publish Smoke Test    | **Yes**         | 1 hr    |

Phases 1 and 7 are the two gates that must pass before any `npm publish`. Phases 2–6 can be worked in parallel and should be complete before the repo is made public.

---

## Implementation Report

### Completed In This Workspace

- [x] Package metadata is publish-ready for `agentcraft@0.2.0`.
- [x] Public npm boundary is restricted to `dist/`, `README.md`, `CHANGELOG.md`, `LICENSE`, and `package.json`.
- [x] OSS health files are present: `LICENSE`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, issue templates, and pull request template.
- [x] GitHub automation is present: Node 20/22 CI matrix, Dependabot config, and npm publish workflow with provenance.
- [x] README and CHANGELOG were updated for the current AgentCraft feature set.
- [x] Documentation dead links found by VitePress were repaired.
- [x] `npm run release:check` passes end to end.
- [x] Clean tarball install was verified from a temporary directory.
- [x] TypeScript import smoke was verified from the packed package.
- [x] Runtime ESM import smoke returned exported names.

### Verification Run

- [x] `npm run build` passed.
- [x] `npm run exports:smoke` passed.
- [x] `npm run format:check` passed.
- [x] `npm run docs:build` passed with TypeDoc warnings only.
- [x] `npm run release:check` passed.
- [x] `npm pack --dry-run --json` showed only the allowlisted package contents.
- [x] Clean install from `agentcraft-0.2.0.tgz` passed.
- [x] Clean install TypeScript check passed for `agentcraft`, `agentcraft/adapters`, and `agentcraft/team`.
- [x] Clean install runtime import returned a non-zero export count.

### Manual Follow-Ups Before Public Release

- Restore or run inside a real Git checkout and verify `.env` was never committed.
- Restore or run inside a real Git checkout and verify generated local directories are not tracked.
- Push to GitHub and confirm license detection.
- Add the `NPM_TOKEN` GitHub Actions secret.
- Test the publish workflow with a pre-release tag before publishing the real release.

### Assumptions To Confirm

- Public GitHub repository URL is currently assumed to be `https://github.com/agentcraft-ai/agentcraft`.
- Docs homepage is currently assumed to be `https://agentcraft.dev`.
- Public security and conduct emails are currently assumed to be `security@agentcraft.dev` and `conduct@agentcraft.dev`.
