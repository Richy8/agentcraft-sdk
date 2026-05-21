import type { AgentAdapter } from '../adapters/types.js';
import type {
  SkillPromptAssemblyMode,
  SkillPromptAssemblyRecord,
  SkillPromptAssemblyReport,
  SkillPromptAssemblySection,
} from '../types.js';
import type { AgentSkill } from './types.js';
import {
  hasDeliverableIntent,
  hasHighRiskIntent,
  hasResearchIntent,
  hasReviewIntent,
  hasToolIntent,
  isAgentSkill,
  isAmbiguousDomainTerm,
  isPromptUnderspecified,
  normalizeActivationText,
  normalizeCandidateTerm,
  promptLikelyContains,
  type SkillActivationMode,
} from './activation-engine.js';

export interface SkillPromptAssemblyContext {
  readonly prompt: string;
  readonly adapters: readonly AgentAdapter[];
  readonly activeSkillCount: number;
  readonly activationMode: SkillActivationMode;
  readonly assemblyMode: SkillPromptAssemblyMode;
}

type AdaptiveSectionName =
  | 'toolUsePolicy'
  | 'outputFormat'
  | 'qualityChecklist'
  | 'failureBehavior'
  | 'examples';

const ADAPTIVE_PROMPT_SECTIONS: readonly AdaptiveSectionName[] = [
  'toolUsePolicy',
  'outputFormat',
  'qualityChecklist',
  'failureBehavior',
  'examples',
];

export function assembleSkillPromptForRun(
  skill: AgentSkill,
  context: SkillPromptAssemblyContext
): string | undefined {
  if (context.assemblyMode === 'full' || !skill.promptTemplate) {
    return rawSkillPrompt(skill);
  }

  const prompt = skill.promptTemplate;
  const sectionScores = scoreSkillPromptSections(skill, context);
  const selectedSections = selectAdaptiveSections(sectionScores, context.assemblyMode);
  const compactness = resolveSectionCompactness(context);

  const parts = [
    `# Skill: ${skill.name}`,
    '',
    '## Role',
    prompt.role,
    '',
    '## Goal',
    prompt.goal,
    '',
    '## Constraints',
    formatPromptBullets(
      rankPromptBullets(prompt.constraints, context, 'constraints').slice(0, compactness.constraints)
    ),
  ];

  if (selectedSections.has('toolUsePolicy')) {
    parts.push(
      '',
      '## Tool Use Policy',
      formatPromptBullets(
        rankPromptBullets(prompt.toolUsePolicy, context, 'tools').slice(0, compactness.toolUsePolicy)
      )
    );
  }
  if (selectedSections.has('outputFormat')) {
    parts.push(
      '',
      '## Output Format',
      formatPromptBullets(
        rankPromptBullets(prompt.outputFormat, context, 'output').slice(0, compactness.outputFormat)
      )
    );
  }
  if (selectedSections.has('qualityChecklist')) {
    parts.push(
      '',
      '## Quality Checklist',
      formatPromptBullets(
        rankPromptBullets(prompt.qualityChecklist, context, 'quality').slice(0, compactness.qualityChecklist)
      )
    );
  }
  if (selectedSections.has('failureBehavior')) {
    parts.push(
      '',
      '## Failure Behavior',
      formatPromptBullets(
        rankPromptBullets(prompt.failureBehavior, context, 'failure').slice(0, compactness.failureBehavior)
      )
    );
  }

  parts.push(
    '',
    '## Safety Notes',
    formatPromptBullets(
      rankPromptBullets(prompt.safetyNotes, context, 'safety').slice(0, compactness.safetyNotes)
    )
  );

  const example = selectedSections.has('examples')
    ? selectBestPromptExample(skill.promptExamples ?? [], context)
    : undefined;
  if (example) {
    parts.push(
      '',
      '## Example Pattern',
      `### ${example.label}`,
      '**Input:**',
      example.input,
      '',
      '**Output:**',
      example.output
    );
    if (example.note) parts.push('', `_Note: ${example.note}_`);
  }

  return parts.filter((part) => part.trim().length > 0).join('\n');
}

export function compileSkillRuntimeContext(
  skill: AgentSkill,
  prompt: string,
  adapters: readonly AgentAdapter[]
): string | undefined {
  const intelligence = skill.skillMetadata?.domainIntelligence;
  if (!intelligence) return undefined;

  const availableAdapterNames = new Set(
    adapters.filter((adapter) => !isAgentSkill(adapter)).map((adapter) => adapter.name)
  );
  const relevantAdapters = [
    ...(skill.skillMetadata?.requiredAdapters ?? []),
    ...(skill.skillMetadata?.optionalAdapters ?? []),
  ].filter((adapter) => availableAdapterNames.has(adapter));
  const missingInput = (intelligence.minimumInput ?? [])
    .filter((item) => !promptLikelyContains(prompt, item))
    .slice(0, 3);
  const riskBoundaries = (intelligence.riskBoundaries ?? []).slice(0, 2);
  const reviewTriggers = (intelligence.humanReviewTriggers ?? [])
    .filter((trigger) => promptLikelyContains(prompt, trigger))
    .slice(0, 2);
  const toolHints = (intelligence.toolsAndDataSources ?? [])
    .filter((hint) =>
      relevantAdapters.some((adapter) => {
        const normalizedAdapter = normalizeCandidateTerm(adapter);
        return normalizedAdapter !== undefined && normalizeActivationText(hint).includes(` ${normalizedAdapter} `);
      })
    )
    .slice(0, 2);

  const lines = [
    `Skill runtime context for ${skill.name}:`,
    relevantAdapters.length > 0
      ? `- Available skill-relevant adapters: ${relevantAdapters.join(', ')}.`
      : undefined,
    missingInput.length > 0
      ? `- Missing-input check: if needed, ask only for ${missingInput.join('; ')}.`
      : undefined,
    toolHints.length > 0 ? `- Tool/data hints: ${toolHints.join('; ')}.` : undefined,
    riskBoundaries.length > 0 ? `- Risk boundaries: ${riskBoundaries.join('; ')}` : undefined,
    reviewTriggers.length > 0
      ? `- Human review triggers present: ${reviewTriggers.join('; ')}.`
      : undefined,
  ].filter((line): line is string => line !== undefined);

  return lines.length > 1 ? lines.join('\n') : undefined;
}

export function inspectSkillPromptAssembly(
  skill: AgentSkill,
  context: SkillPromptAssemblyContext,
  input: {
    readonly promptExtension: string;
    readonly runtimeContext?: string | undefined;
    readonly directiveBoundary: boolean;
  }
): SkillPromptAssemblyRecord {
  const fullPrompt = rawSkillPrompt(skill);
  const includedSections = includedPromptSections(skill, context);
  const omittedSections = allPromptSections(skill).filter(
    (section) => !includedSections.includes(section)
  );
  return {
    skill: skill.name,
    mode: context.assemblyMode,
    activationMode: context.activationMode,
    directiveBoundary: input.directiveBoundary,
    activeSkillCount: context.activeSkillCount,
    includedSections,
    omittedSections,
    assemblyChars: input.promptExtension.length + (input.runtimeContext?.length ?? 0),
    ...(fullPrompt !== undefined && { fullPromptChars: fullPrompt.length }),
    runtimeContextIncluded: input.runtimeContext !== undefined && input.runtimeContext.trim().length > 0,
  };
}

export function buildSkillPromptAssemblyReport(
  mode: SkillPromptAssemblyMode,
  records: readonly SkillPromptAssemblyRecord[]
): SkillPromptAssemblyReport | undefined {
  if (records.length === 0) return undefined;
  return { mode, records };
}

function includedPromptSections(
  skill: AgentSkill,
  context: SkillPromptAssemblyContext
): readonly SkillPromptAssemblySection[] {
  if (!skill.promptTemplate) return ['systemPromptExtension'];
  if (context.assemblyMode === 'full') {
    return allPromptSections(skill).filter((section) => section !== 'systemPromptExtension');
  }
  const selected = selectAdaptiveSections(scoreSkillPromptSections(skill, context), context.assemblyMode);
  return [
    'role',
    'goal',
    'constraints',
    ...ADAPTIVE_PROMPT_SECTIONS.filter((section) => selected.has(section)),
    'safetyNotes',
  ];
}

function allPromptSections(skill: AgentSkill): readonly SkillPromptAssemblySection[] {
  if (!skill.promptTemplate) return ['systemPromptExtension'];
  return [
    'role',
    'goal',
    'constraints',
    'toolUsePolicy',
    'outputFormat',
    'qualityChecklist',
    'failureBehavior',
    'safetyNotes',
    ...((skill.promptExamples?.length ?? 0) > 0 ? ['examples' as const] : []),
  ];
}

function rawSkillPrompt(skill: AgentSkill): string | undefined {
  return typeof skill.systemPromptExtension === 'function'
    ? skill.systemPromptExtension()
    : skill.systemPromptExtension;
}

function scoreSkillPromptSections(
  skill: AgentSkill,
  context: SkillPromptAssemblyContext
): Record<AdaptiveSectionName, number> {
  const normalizedPrompt = normalizeActivationText(context.prompt);
  const stage = skill.skillMetadata?.stage;
  const sideEffectRisk = skill.skillMetadata?.sideEffectRisk ?? 'none';
  const deliverable = hasDeliverableIntent(normalizedPrompt);
  const review = hasReviewIntent(normalizedPrompt) || stage === 'review';
  const research = hasResearchIntent(normalizedPrompt) || stage === 'context';
  const vague = isPromptUnderspecified(context.prompt);
  const highRisk =
    sideEffectRisk === 'write' ||
    sideEffectRisk === 'external' ||
    hasHighRiskIntent(normalizedPrompt);
  const relevantAdapterCount = relevantSkillAdapters(skill, context.adapters).length;
  const toolIntent = hasToolIntent(normalizedPrompt) || relevantAdapterCount > 0;
  const multiSkillPressure = context.activeSkillCount > 2;

  return {
    toolUsePolicy:
      25 +
      (toolIntent ? 35 : 0) +
      (research ? 20 : 0) +
      (highRisk ? 20 : 0) +
      (relevantAdapterCount > 0 ? 15 : 0),
    outputFormat:
      35 +
      (deliverable ? 35 : 0) +
      (review ? 20 : 0) +
      (stage === 'creation' || stage === 'strategy' || stage === 'operations' ? 15 : 0),
    qualityChecklist: 40 + (deliverable || review ? 30 : 0) + (context.activeSkillCount <= 2 ? 10 : 0),
    failureBehavior:
      25 +
      (vague ? 25 : 0) +
      (highRisk ? 20 : 0) +
      (missingInputLikely(skill, context.prompt) ? 25 : 0) +
      (multiSkillPressure ? 10 : 0),
    examples:
      10 +
      (deliverable ? 25 : 0) +
      (vague ? 20 : 0) +
      (context.activeSkillCount <= 1 ? 20 : 0) -
      (multiSkillPressure ? 30 : 0),
  };
}

function selectAdaptiveSections(
  scores: Record<AdaptiveSectionName, number>,
  mode: SkillPromptAssemblyMode
): Set<AdaptiveSectionName> {
  if (mode === 'minimal') {
    return new Set(
      (Object.entries(scores) as Array<[AdaptiveSectionName, number]>)
        .filter(([section, score]) => section !== 'examples' && score >= 85)
        .map(([section]) => section)
    );
  }

  const threshold = mode === 'compact' ? 68 : 55;
  const bustAllowance = mode === 'compact' ? 1 : 2;
  const selected = new Set<AdaptiveSectionName>(
    (Object.entries(scores) as Array<[AdaptiveSectionName, number]>)
      .filter(([, score]) => score >= threshold)
      .map(([section]) => section)
  );
  const nearMisses = (Object.entries(scores) as Array<[AdaptiveSectionName, number]>)
    .filter(([section, score]) => !selected.has(section) && section !== 'examples' && score >= threshold - 12)
    .sort((left, right) => right[1] - left[1])
    .slice(0, bustAllowance);
  for (const [section] of nearMisses) selected.add(section);
  return selected;
}

function resolveSectionCompactness(context: SkillPromptAssemblyContext): {
  constraints: number;
  toolUsePolicy: number;
  outputFormat: number;
  qualityChecklist: number;
  failureBehavior: number;
  safetyNotes: number;
} {
  if (context.assemblyMode === 'minimal') {
    return { constraints: 3, toolUsePolicy: 2, outputFormat: 3, qualityChecklist: 2, failureBehavior: 2, safetyNotes: 3 };
  }
  if (context.assemblyMode === 'compact' || context.activeSkillCount > 3) {
    return { constraints: 5, toolUsePolicy: 3, outputFormat: 4, qualityChecklist: 3, failureBehavior: 2, safetyNotes: 4 };
  }
  if (context.activeSkillCount > 1) {
    return { constraints: 6, toolUsePolicy: 4, outputFormat: 5, qualityChecklist: 4, failureBehavior: 3, safetyNotes: 4 };
  }
  return {
    constraints: Number.POSITIVE_INFINITY,
    toolUsePolicy: Number.POSITIVE_INFINITY,
    outputFormat: Number.POSITIVE_INFINITY,
    qualityChecklist: 5,
    failureBehavior: 3,
    safetyNotes: 5,
  };
}

function rankPromptBullets(
  items: readonly string[],
  context: SkillPromptAssemblyContext,
  purpose: 'constraints' | 'tools' | 'output' | 'quality' | 'failure' | 'safety'
): string[] {
  return [...items].sort(
    (left, right) => scorePromptBullet(right, context, purpose) - scorePromptBullet(left, context, purpose)
  );
}

function scorePromptBullet(
  item: string,
  context: SkillPromptAssemblyContext,
  purpose: 'constraints' | 'tools' | 'output' | 'quality' | 'failure' | 'safety'
): number {
  const text = normalizeActivationText(item);
  const prompt = normalizeActivationText(context.prompt);
  let score = purpose === 'constraints' || purpose === 'safety' ? 30 : 10;
  const itemTerms =
    normalizeCandidateTerm(item)
      ?.split(/\s+/)
      .filter((term) => term.length > 4)
      .slice(0, 6) ?? [];
  if (itemTerms.some((term) => prompt.includes(` ${term} `))) score += 30;
  if (/do not|never|must|require|approval|untrusted|evidence|source|assumption|missing|failure/i.test(item)) score += 18;
  if (purpose === 'tools' && hasToolIntent(prompt)) score += 25;
  if (purpose === 'output' && hasDeliverableIntent(prompt)) score += 25;
  if (purpose === 'failure' && isPromptUnderspecified(context.prompt)) score += 25;
  if (purpose === 'safety' && hasHighRiskIntent(prompt)) score += 25;
  if (text.includes('external') || text.includes('publish') || text.includes('write')) score += 8;
  return score;
}

function formatPromptBullets(items: readonly string[]): string {
  return items.map((item) => `- ${item}`).join('\n');
}

function selectBestPromptExample(
  examples: readonly NonNullable<AgentSkill['promptExamples']>[number][],
  context: SkillPromptAssemblyContext
): NonNullable<AgentSkill['promptExamples']>[number] | undefined {
  if (examples.length === 0) return undefined;
  const prompt = normalizeActivationText(context.prompt);
  return [...examples].sort((left, right) => scoreExample(right, prompt) - scoreExample(left, prompt))[0];
}

function scoreExample(
  example: NonNullable<AgentSkill['promptExamples']>[number],
  normalizedPrompt: string
): number {
  const haystack = `${example.label} ${example.input} ${example.output} ${example.note ?? ''}`;
  const terms =
    normalizeCandidateTerm(haystack)
      ?.split(/\s+/)
      .filter((term) => term.length > 4)
      .slice(0, 16) ?? [];
  return terms.filter((term) => normalizedPrompt.includes(` ${term} `)).length;
}

function relevantSkillAdapters(skill: AgentSkill, adapters: readonly AgentAdapter[]): string[] {
  const availableAdapterNames = new Set(
    adapters.filter((adapter) => !isAgentSkill(adapter)).map((adapter) => adapter.name)
  );
  return [
    ...(skill.skillMetadata?.requiredAdapters ?? []),
    ...(skill.skillMetadata?.optionalAdapters ?? []),
  ].filter((adapter) => availableAdapterNames.has(adapter));
}

function missingInputLikely(skill: AgentSkill, prompt: string): boolean {
  const minimumInput = skill.skillMetadata?.domainIntelligence?.minimumInput ?? [];
  if (minimumInput.length === 0) return false;
  return minimumInput.some((item) => !promptLikelyContains(prompt, item));
}
