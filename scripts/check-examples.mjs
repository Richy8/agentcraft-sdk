import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';

const packageRoot = process.cwd();
const examplesDir = path.join(packageRoot, 'examples');
const docsDir = path.join(packageRoot, 'docs');
const allowedPackageImports = new Set([
  'agentcraft',
  'agentcraft/adapters',
  'agentcraft/skills',
  'agentcraft/packs',
  'agentcraft/mcp',
  'agentcraft/team',
]);

const failures = [];

for (const filePath of await listFiles(examplesDir, (item) => item.endsWith('.ts'))) {
  const source = await readFile(filePath, 'utf8');
  checkTranspile(filePath, source);
  checkImports(filePath, source);
}

for (const filePath of await listFiles(docsDir, (item) => item.endsWith('.md'))) {
  await checkVitePressIncludes(filePath);
}

if (failures.length > 0) {
  console.error('Example smoke check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Example smoke check passed.');
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

function checkTranspile(filePath, source) {
  const result = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.Node16,
      moduleResolution: ts.ModuleResolutionKind.Node16,
      strict: true,
    },
    fileName: filePath,
    reportDiagnostics: true,
  });

  for (const diagnostic of result.diagnostics ?? []) {
    if (diagnostic.category === ts.DiagnosticCategory.Error) {
      failures.push(`${relative(filePath)}: ${flattenDiagnostic(diagnostic)}`);
    }
  }
}

function checkImports(filePath, source) {
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.ES2022,
    true,
    ts.ScriptKind.TS
  );
  sourceFile.forEachChild((node) => {
    if (!ts.isImportDeclaration(node) || !ts.isStringLiteral(node.moduleSpecifier)) return;
    const specifier = node.moduleSpecifier.text;
    if (specifier.startsWith('agentcraft') && !allowedPackageImports.has(specifier)) {
      failures.push(`${relative(filePath)}: unsupported package import '${specifier}'`);
    }
    if (specifier.startsWith('.')) {
      const resolved = path.resolve(path.dirname(filePath), specifier);
      if (!existsWithTsOrJsExtension(resolved)) {
        failures.push(`${relative(filePath)}: relative import '${specifier}' does not resolve`);
      }
    }
  });
}

async function checkVitePressIncludes(filePath) {
  const markdown = await readFile(filePath, 'utf8');
  const includePattern = /^<<<\s+(.+)$/gm;
  for (const match of markdown.matchAll(includePattern)) {
    const rawInclude = match[1]?.trim();
    if (!rawInclude) continue;
    const includePath = rawInclude.split(/[{\s]/)[0];
    const resolved = path.resolve(path.dirname(filePath), includePath);
    if (!existsSync(resolved) || !resolved.startsWith(packageRoot)) {
      failures.push(
        `${relative(filePath)}: VitePress include '${includePath}' does not resolve inside package`
      );
    }
  }
}

function existsWithTsOrJsExtension(basePath) {
  return ['', '.ts', '.tsx', '.js', '.mjs'].some((extension) =>
    existsSync(`${basePath}${extension}`)
  );
}

function flattenDiagnostic(diagnostic) {
  return ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ');
}

function relative(filePath) {
  return path.relative(packageRoot, filePath);
}
