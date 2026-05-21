import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const checkOnly = process.argv.includes('--check');
const packRoot = path.join(root, 'src/agent/skills/packs');
const publicPackIndex = path.join(root, 'src/agent/packs/index.ts');
const catalogRoot = path.join(root, 'src/agent/skills/domains/__catalog__');
const catalogSource = fs.readFileSync(path.join(catalogRoot, 'domain-catalog.ts'), 'utf8');
const catalogFiles = [...catalogSource.matchAll(/from '\.\/domains\/([^']+\.catalog)\.js'/g)].map(
  (match) => `${match[1]}.ts`,
);
const catalogEntryPattern =
  /\{\s*domain:\s*['"]([^'"]+)['"],\s*category:\s*['"]([^'"]+)['"],\s*title:\s*['"]([^'"]+)['"],\s*plannedSkills:\s*\[([^\]]*)\]/g;

if (catalogFiles.length === 0) {
  throw new Error('No domain catalog files referenced from domain-catalog.ts');
}

const entries = catalogFiles.flatMap((catalogFile) => {
  const source = fs.readFileSync(path.join(catalogRoot, 'domains', catalogFile), 'utf8');
  const parsed = [];
  let match;
  while ((match = catalogEntryPattern.exec(source))) {
    const [, domain, category, title, skillsText] = match;
    const plannedSkills = [...skillsText.matchAll(/['"]([^'"]+)['"]/g)].map((item) => item[1]);
    parsed.push({ domain, category, title, plannedSkills });
  }
  return parsed;
});

if (entries.length === 0) {
  throw new Error('No domain catalog entries parsed');
}

const packAliases = {
  creator: {
    seo: 'marketing-seo-skills',
    social: 'creator-x-twitter-skills',
    video: 'creator-youtube-skills',
    copy: 'marketing-landing-page-skills',
    publishing: 'creator-newsletter-skills',
    analytics: 'marketing-digital-marketing-skills',
  },
  finance: {
    marketUpdate: 'finance-market-research-skills',
  },
  'personal-productivity': {
    weeklyPlanning: 'personal-productivity-tasks-skills',
  },
};

const domainExportNames = {
  brand: 'Brand',
  business: 'Business',
  creator: 'Creator',
  'data-analytics': 'DataAnalytics',
  engineering: 'Engineering',
  finance: 'Finance',
  healthcare: 'Healthcare',
  legal: 'Legal',
  marketing: 'Marketing',
  'personal-productivity': 'PersonalProductivity',
  product: 'Product',
  sales: 'Sales',
  support: 'Support',
};

function constantName(domain, category) {
  return `${domain}_${category}_PACK_SPEC`.replace(/-/g, '_').toUpperCase();
}

function titleCase(value) {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function camelCase(value) {
  return value.replace(/-([a-z0-9])/g, (_match, char) => char.toUpperCase());
}

function needsHumanReview(domain, category) {
  return (
    ['finance', 'legal', 'healthcare'].includes(domain) ||
    (domain === 'business' && ['investments', 'market-expansion'].includes(category))
  );
}

function packName(entry) {
  return `${entry.domain}-${entry.category}-skills`;
}

function packFile(entry) {
  const name = packName(entry);
  const constName = constantName(entry.domain, entry.category);
  const docsPath = entry.domain === 'creator' ? 'docs/creator/packs.md' : 'docs/packs/industry.md';
  const examples = [
    `createSkillPackByName("${name}")`,
    `agent.use(createSkillPackByName("${name}"))`,
    `agent.run({ prompt: "/...", use: createSkillPackByName("${name}") })`,
  ];

  return [
    "import { definePackSpec } from '../../../packs/registry.js';",
    '',
    `export const ${constName} = definePackSpec({`,
    `  name: '${name}',`,
    `  description: '${entry.title} ${titleCase(entry.category)} skill pack.',`,
    `  domain: '${entry.domain}',`,
    `  category: '${entry.category}',`,
    '  skillIds: [',
    ...entry.plannedSkills.map((skill) => `    '${skill}',`),
    '  ],',
    "  defaultConfig: { skillActivation: 'auto', toolSelection: 'auto', readOnlyByDefault: true },",
    `  docsPath: '${docsPath}',`,
    '  examples: [',
    ...examples.map((example) => `    '${example}',`),
    '  ],',
    ...(needsHumanReview(entry.domain, entry.category) ? ['  humanReviewRequired: true,'] : []),
    '});',
    '',
  ].join('\n');
}

function domainIndexFile(entriesForDomain) {
  return [
    ...entriesForDomain.map(
      (entry) => `export { ${constantName(entry.domain, entry.category)} } from './${entry.category}.pack.js';`,
    ),
    '',
  ].join('\n');
}

function skillPackRootIndex(entriesByDomain) {
  const imports = entries.map(
    (entry) => `import { ${constantName(entry.domain, entry.category)} } from './${entry.domain}/${entry.category}.pack.js';`,
  );
  const specs = entries.map((entry) => `  ${constantName(entry.domain, entry.category)},`);
  return [
    "import '../domains/index.js';",
    "import { createSkillByName, requireSkillInspection } from '../registries/index.js';",
    "import type { SkillInspection } from '../registries/index.js';",
    "import { PackRegistry, createPackFromSpec, getPackSpec as getRegistryPackSpec, listPackSpecs as listRegistryPackSpecs } from '../../packs/registry.js';",
    "import type { PackConfig, PackSpec, PackSpecFilter } from '../../packs/registry.js';",
    '',
    ...imports,
    '',
    "export type { PackConfig, PackSpec, PackSpecFilter } from '../../packs/registry.js';",
    '',
    'export interface SkillPackInspection {',
    '  readonly name: string;',
    '  readonly description: string;',
    '  readonly domain: string;',
    '  readonly category: string;',
    '  readonly skillIds: readonly string[];',
    '  readonly skills: readonly SkillInspection[];',
    '  readonly defaultConfig?: PackConfig;',
    '  readonly docsPath?: string;',
    '  readonly examples: readonly string[];',
    '  readonly humanReviewRequired: boolean;',
    "  readonly sideEffectRisk?: PackSpec['sideEffectRisk'];",
    '}',
    '',
    'export const SKILL_PACK_SPECS = [',
    ...specs,
    '] as const satisfies readonly PackSpec[];',
    '',
    'export const skillPackRegistry = new PackRegistry(SKILL_PACK_SPECS);',
    '',
    'export function listSkillPackSpecs(filter: PackSpecFilter = {}): PackSpec[] {',
    '  return listRegistryPackSpecs(filter, skillPackRegistry);',
    '}',
    '',
    'export function getSkillPackSpec(name: string): PackSpec | undefined {',
    '  return getRegistryPackSpec(name, skillPackRegistry);',
    '}',
    '',
    'export function inspectSkillPackSpec(spec: PackSpec): SkillPackInspection {',
    '  return {',
    '    name: spec.name,',
    '    description: spec.description,',
    '    domain: spec.domain,',
    '    category: spec.category,',
    '    skillIds: spec.skillIds,',
    '    skills: spec.skillIds.map((skillId) => requireSkillInspection(skillId)),',
    '    ...(spec.defaultConfig !== undefined && { defaultConfig: spec.defaultConfig }),',
    '    ...(spec.docsPath !== undefined && { docsPath: spec.docsPath }),',
    '    examples: spec.examples ?? [],',
    '    humanReviewRequired: spec.humanReviewRequired ?? false,',
    '    ...(spec.sideEffectRisk !== undefined && { sideEffectRisk: spec.sideEffectRisk }),',
    '  };',
    '}',
    '',
    'export function inspectSkillPackByName(name: string): SkillPackInspection | undefined {',
    '  const spec = getSkillPackSpec(name);',
    '  return spec ? inspectSkillPackSpec(spec) : undefined;',
    '}',
    '',
    'export function requireSkillPackInspection(name: string): SkillPackInspection {',
    '  const inspection = inspectSkillPackByName(name);',
    "  if (!inspection) throw new Error(`Unknown skill pack spec '${name}'`);",
    '  return inspection;',
    '}',
    '',
    'export function listSkillPackInspections(filter: PackSpecFilter = {}): SkillPackInspection[] {',
    '  return listSkillPackSpecs(filter).map(inspectSkillPackSpec);',
    '}',
    '',
    'export function createSkillPackByName(name: string, config?: PackConfig) {',
    '  const spec = getSkillPackSpec(name);',
    "  if (!spec) throw new Error(`Unknown skill pack spec '${name}'`);",
    '  return createPackFromSpec(spec, createSkillByName, config);',
    '}',
    '',
    ...[...entriesByDomain.keys()].sort().map((domain) => `export * from './${domain}/index.js';`),
    '',
  ].join('\n');
}

function publicPackAccessorIndex(entriesByDomain) {
  const domainBlocks = [...entriesByDomain.entries()].map(([domain, entriesForDomain]) => {
    const exportName = domainExportNames[domain] ?? titleCase(domain).replace(/\s+/g, '');
    const categoryAccessors = entriesForDomain.map(
      (entry) => `  ${camelCase(entry.category)}: domainPack('${packName(entry)}'),`,
    );
    const aliasAccessors = Object.entries(packAliases[domain] ?? {}).map(
      ([name, aliasPackName]) => `  ${name}: domainPack('${aliasPackName}'),`,
    );
    return [
      `export const ${exportName}Pack = {`,
      ...categoryAccessors,
      ...aliasAccessors,
      '} as const;',
      '',
    ].join('\n');
  });

  const aliases = [...entriesByDomain.keys()].map((domain) => {
    const exportName = domainExportNames[domain] ?? titleCase(domain).replace(/\s+/g, '');
    return `export const ${exportName}Packs = ${exportName}Pack;`;
  });

  return [
    "import { createSkillByName, requireSkillInspection } from '../skills/registries/index.js';",
    "import type { SkillInspection } from '../skills/registries/index.js';",
    "import { createSkillPackByName, requireSkillPackInspection } from '../skills/packs/index.js';",
    "import type { SkillPackInspection } from '../skills/packs/index.js';",
    "import type { AgentSkill } from '../skills/types.js';",
    "import type { PackConfig } from './registry.js';",
    '',
    "export type { CreatorPackConfig } from '../creator/types.js';",
    'export {',
    '  PackRegistry,',
    '  createPackFromSpec,',
    '  definePackSpec,',
    '  defaultPackRegistry,',
    '  getPackSpec,',
    '  listPackSpecs,',
    '  registerPackSpecs,',
    "} from './registry.js';",
    "export type { PackConfig, PackSkillOverride, PackSkillResolver, PackSpec, PackSpecFilter } from './registry.js';",
    'export {',
    '  SKILL_PACK_SPECS,',
    '  createSkillPackByName,',
    '  getSkillPackSpec,',
    '  inspectSkillPackByName,',
    '  inspectSkillPackSpec,',
    '  listSkillPackInspections,',
    '  listSkillPackSpecs,',
    '  requireSkillPackInspection,',
    '  skillPackRegistry,',
    "} from '../skills/packs/index.js';",
    '',
    'export interface SkillAccessor {',
    '  create(): AgentSkill;',
    '  inspect(): SkillInspection;',
    '}',
    '',
    'export type DerivedSkillAccessors = Readonly<Record<string, SkillAccessor>>;',
    '',
    'export interface DomainPackControls {',
    '  readonly inspect: () => SkillPackInspection;',
    '  readonly listSkills: () => readonly SkillInspection[];',
    '  readonly getSkill: (skillIdOrAccessor: string) => SkillAccessor;',
    '}',
    '',
    'export type DomainPackResult = ReturnType<typeof createSkillPackByName> &',
    '  DerivedSkillAccessors &',
    '  DomainPackControls;',
    '',
    'function domainPack(packName: string): (config?: PackConfig) => DomainPackResult {',
    '  return (config) => {',
    '    const pack = createSkillPackByName(packName, config);',
    '    const inspectPack = () => requireSkillPackInspection(packName);',
    '    const skillAccessors = Object.fromEntries(',
    '      inspectPack().skillIds.flatMap((skillId) => {',
    '        const accessor = skillAccessor(skillId);',
    '        const derived = skillAccessorName(skillId);',
    '        return derived === skillId',
    '          ? [[derived, accessor]]',
    '          : [',
    '              [derived, accessor],',
    '              [skillId, accessor],',
    '            ];',
    '      }),',
    '    ) as DerivedSkillAccessors;',
    '    return Object.assign(pack, {',
    '      inspect: inspectPack,',
    '      listSkills: () => inspectPack().skills,',
    '      getSkill: (skillIdOrAccessor: string) => {',
    '        const accessor = skillAccessors[skillIdOrAccessor] ?? skillAccessors[skillAccessorName(skillIdOrAccessor)];',
    '        if (!accessor) {',
    "          throw new Error(`Pack '${packName}' does not include skill '${skillIdOrAccessor}'`);",
    '        }',
    '        return accessor;',
    '      },',
    '    }, skillAccessors) as DomainPackResult;',
    '  };',
    '}',
    '',
    'function skillAccessor(skillId: string): SkillAccessor {',
    '  return {',
    '    create: () => createSkillByName(skillId),',
    '    inspect: () => requireSkillInspection(skillId),',
    '  };',
    '}',
    '',
    'function skillAccessorName(skillId: string): string {',
    "  return skillId.replace(/-([a-z0-9])/g, (_match, value: string) => value.toUpperCase());",
    '}',
    '',
    ...domainBlocks,
    ...aliases,
    '',
    "export { createSkillPackByName as createPackByName } from '../skills/packs/index.js';",
    '',
  ].join('\n');
}

const entriesByDomain = new Map();
for (const entry of entries) {
  if (!entriesByDomain.has(entry.domain)) entriesByDomain.set(entry.domain, []);
  entriesByDomain.get(entry.domain).push(entry);
}

const renderedFiles = new Map();
for (const entry of entries) {
  renderedFiles.set(path.join(packRoot, entry.domain, `${entry.category}.pack.ts`), packFile(entry));
}
for (const [domain, entriesForDomain] of entriesByDomain) {
  renderedFiles.set(path.join(packRoot, domain, 'index.ts'), domainIndexFile(entriesForDomain));
}
renderedFiles.set(path.join(packRoot, 'index.ts'), skillPackRootIndex(entriesByDomain));
renderedFiles.set(publicPackIndex, publicPackAccessorIndex(entriesByDomain));

const stalePackFiles = fs.existsSync(packRoot)
  ? fs
      .readdirSync(packRoot, { recursive: true })
      .map((file) => path.join(packRoot, file))
      .filter((file) => fs.statSync(file).isFile() && file.endsWith('.pack.ts') && !renderedFiles.has(file))
  : [];

if (checkOnly) {
  const mismatches = [];
  for (const [file, expected] of renderedFiles) {
    const actual = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
    if (actual !== expected) mismatches.push(path.relative(root, file));
  }
  mismatches.push(...stalePackFiles.map((file) => path.relative(root, file)));
  if (mismatches.length > 0) {
    throw new Error(`Generated skill pack files are stale:\n${mismatches.map((file) => `- ${file}`).join('\n')}`);
  }
  console.log(`Skill pack generated files are current (${entries.length} pack specs)`);
} else {
  for (const [file, content] of renderedFiles) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  for (const file of stalePackFiles) fs.unlinkSync(file);
  console.log(`Generated ${entries.length} skill pack specs`);
}
