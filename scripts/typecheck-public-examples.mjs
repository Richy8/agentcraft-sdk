import { existsSync } from "node:fs";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const packageRoot = process.cwd();
const examplesDir = path.join(packageRoot, "examples");
const docsDir = path.join(packageRoot, "docs");
const distIndex = path.join(packageRoot, "dist", "index.d.ts");
const allowedPackageImports = new Set([
  "agentcraft",
  "agentcraft/adapters",
  "agentcraft/skills",
  "agentcraft/packs",
  "agentcraft/mcp",
  "agentcraft/team",
]);
const stalePublicApiPatterns = [
  {
    pattern: /AgentCache\.file\(\s*\{\s*root\s*:/,
    message:
      "Use AgentCache.file(root, options), not AgentCache.file({ root }).",
  },
  {
    pattern: /toolPolicy\s*:\s*\{[^}]*\bmaxCalls\s*:/s,
    message: "Use run budget.maxToolCalls, not toolPolicy.maxCalls.",
  },
  {
    pattern: /\bmaxCostUsd\s*:/,
    message: "Use budget.maxCost, not maxCostUsd.",
  },
  {
    pattern: /new\s+Agent\s*\(/,
    message: "Use Agent.create(...), not new Agent(...).",
  },
  {
    pattern: /responseFormat\s*:\s*\{\s*type\s*:\s*['"]json_schema['"]/s,
    message: "Use responseSchema for JSON schema output examples.",
  },
];

const failures = [];

if (!existsSync(distIndex)) {
  failures.push(
    "dist/index.d.ts is missing. Run npm run build before examples:typecheck.",
  );
}

const tempRoot = await mkdtemp(
  path.join(tmpdir(), "agentcraft-public-examples-"),
);
try {
  const exampleFiles = await listFiles(examplesDir, (filePath) =>
    filePath.endsWith(".ts"),
  );
  for (const filePath of exampleFiles) {
    await checkPublicImports(filePath, await readFile(filePath, "utf8"));
  }
  if (exampleFiles.length > 0) await typecheckFiles(exampleFiles, "examples");

  const snippetFiles = [];
  const docsFiles = (
    await listFiles(docsDir, (filePath) => filePath.endsWith(".md"))
  ).filter(isAuthoredDoc);
  for (const filePath of docsFiles) {
    const markdown = await readFile(filePath, "utf8");
    checkStalePatterns(filePath, markdownCodeFenceText(markdown));
    snippetFiles.push(
      ...(await extractCopyableTypeScriptSnippets(filePath, markdown)),
    );
  }
  if (snippetFiles.length > 0)
    await typecheckFiles(snippetFiles, "docs copyable TypeScript snippets");
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error("Public example typecheck failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log("Public example typecheck passed.");
}

async function listFiles(dirPath, predicate) {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(entryPath, predicate)));
      continue;
    }
    if (predicate(entryPath)) files.push(entryPath);
  }
  return files.sort((a, b) => a.localeCompare(b));
}

function isAuthoredDoc(filePath) {
  const normalized = filePath.split(path.sep).join("/");
  return (
    !normalized.includes("/docs/public/") &&
    !normalized.includes("/docs/.vitepress/")
  );
}

async function extractCopyableTypeScriptSnippets(filePath, markdown) {
  const snippets = [];
  const fencePattern = /```(?:ts|typescript)\n([\s\S]*?)```/g;
  let index = 0;
  for (const match of markdown.matchAll(fencePattern)) {
    index += 1;
    const source = match[1]?.trim();
    if (!source || !source.includes("from 'agentcraft")) continue;
    await checkPublicImports(filePath, source);
    const snippetPath = path.join(
      tempRoot,
      `${relative(filePath).replace(/[^a-zA-Z0-9._-]/g, "_")}_${index}.ts`,
    );
    await writeFile(snippetPath, source, "utf8");
    snippets.push(snippetPath);
  }
  return snippets;
}

async function typecheckFiles(files, label) {
  const result = spawnSync(
    process.execPath,
    [
      "./node_modules/typescript/bin/tsc",
      "--noEmit",
      "--target",
      "ES2022",
      "--module",
      "Node16",
      "--moduleResolution",
      "Node16",
      "--strict",
      "--skipLibCheck",
      ...files,
    ],
    { cwd: packageRoot, encoding: "utf8" },
  );
  if (result.status === 0) return;
  failures.push(
    `${label} failed TypeScript public API check:\n${result.stdout}${result.stderr}`,
  );
}

async function checkPublicImports(filePath, source) {
  const importPattern = /from\s+['"]([^'"]+)['"]/g;
  for (const match of source.matchAll(importPattern)) {
    const specifier = match[1];
    if (
      specifier?.startsWith("agentcraft") &&
      !allowedPackageImports.has(specifier)
    ) {
      failures.push(
        `${relative(filePath)}: unsupported public import '${specifier}'`,
      );
    }
  }
}

function checkStalePatterns(filePath, source) {
  for (const check of stalePublicApiPatterns) {
    if (check.pattern.test(source))
      failures.push(`${relative(filePath)}: ${check.message}`);
  }
}

function markdownCodeFenceText(markdown) {
  return [
    ...markdown.matchAll(/```(?:ts|typescript|js|javascript)\n([\s\S]*?)```/g),
  ]
    .map((match) => match[1] ?? "")
    .join("\n\n");
}

function relative(filePath) {
  return path.relative(packageRoot, filePath);
}
