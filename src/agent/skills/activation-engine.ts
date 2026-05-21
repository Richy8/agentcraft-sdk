import type { AgentAdapter } from '../adapters/types.js';
import type { CapabilityExpression, CreatorSkillManifest } from '../creator/types.js';
import type { AdapterRef, AgentSkill } from './types.js';
import type { AgentRunParams, SkillActivationReason } from '../types.js';

export interface ActiveSkillMatch extends Omit<SkillActivationReason, 'skill' | 'matched'> {
  readonly skill: AgentSkill;
  readonly matched?: string;
}

export type SkillActivationMode = 'always' | 'auto' | 'directive-only';

interface ActivationTerm {
  readonly term: string;
  readonly reason: Exclude<
    SkillActivationReason['reason'],
    'always' | 'directive' | 'not-activated' | 'semantic'
  >;
  readonly confidence: number;
}

interface SkillActivationMatch {
  readonly term: string;
  readonly reason: SkillActivationReason['reason'];
  readonly confidence: number;
}

const AUTO_SKILL_ACTIVATION_CAP = 4;
const AUTO_SKILL_ACTIVATION_MIN_CONFIDENCE = 0.74;

export function selectActiveSkillMatches(input: {
  readonly params: AgentRunParams;
  readonly adapters: readonly AgentAdapter[];
  readonly mode: SkillActivationMode;
}): ActiveSkillMatch[] {
  const skills = input.adapters.filter(isAgentSkill);
  if (input.mode === 'always') {
    return skills.map((skill) => ({
      skill,
      reason: 'always',
      confidence: 1,
    }));
  }

  const prompt = trustedActivationText(input.params.prompt ?? '');
  const normalizedPrompt = normalizeActivationText(prompt);
  const directiveNames = new Set(
    Array.from(prompt.matchAll(/(?:^|\s)\/([a-zA-Z][\w-]*)/g)).map((match) => match[1]!)
  );
  if (input.mode === 'directive-only') {
    return skills.flatMap<ActiveSkillMatch>((skill) =>
      skill.directive && directiveNames.has(skill.directive)
        ? [
            {
              skill,
              reason: 'directive' as const,
              confidence: 1,
              matched: `/${skill.directive}`,
            },
          ]
        : []
    );
  }

  return skills
    .flatMap<ActiveSkillMatch>((skill) => {
      if (skill.directive && directiveNames.has(skill.directive)) {
        return [
          {
            skill,
            reason: 'directive' as const,
            confidence: 1,
            matched: `/${skill.directive}`,
          },
        ];
      }
      const matched = skill.skillMetadata?.domain
        ? domainSkillActivationMatch(skill, prompt, normalizedPrompt)
        : legacyOrGenericSkillActivationMatch(skill, prompt, normalizedPrompt);
      return matched && !shouldSkipAutoActivation(skill.name, prompt)
        ? [
            {
              skill,
              reason: matched.reason,
              confidence: adjustedAutoSkillConfidence(skill.name, prompt, matched),
              matched: matched.term.trim(),
            },
          ]
        : [];
    })
    .sort((left, right) => right.confidence - left.confidence)
    .slice(0, AUTO_SKILL_ACTIVATION_CAP);
}

export function selectActiveSkills(input: {
  readonly params: AgentRunParams;
  readonly adapters: readonly AgentAdapter[];
  readonly mode: SkillActivationMode;
}): AgentSkill[] {
  return selectActiveSkillMatches(input).map((match) => match.skill);
}

export function isAgentSkill(adapter: AgentAdapter): adapter is AgentSkill {
  return 'type' in adapter && adapter.type === 'skill';
}

export function flattenCapabilityExpressions(expressions: readonly CapabilityExpression[]): string[] {
  return expressions.flatMap((expression) => {
    if (typeof expression === 'string') return [expression];
    if ('oneOf' in expression) return expression.oneOf;
    return expression.allOf;
  });
}

export function adapterRefName(ref: AdapterRef): string {
  if (typeof ref !== 'function') {
    return 'name' in ref ? ref.name : (ref.adapterName ?? ref.skillName ?? 'unknown');
  }
  const candidate =
    (ref as unknown as { adapterName?: string; skillName?: string }).adapterName ??
    (ref as unknown as { skillName?: string }).skillName;
  if (candidate) return candidate;
  return ref.name
    .replace(/Adapter$/, '')
    .replace(/Skill$/, '')
    .replace(/MCP$/, '')
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase();
}

export function isAttachedTo(adapters: readonly AgentAdapter[], ref: AdapterRef): boolean {
  const expected = adapterRefName(ref);
  return adapters.some((adapter) => adapter.name === expected);
}

export function normalizeActivationText(value: string): string {
  return ` ${value.toLowerCase().replace(/[^a-z0-9/]+/g, ' ')} `;
}

export function normalizeCandidateTerm(value: string | undefined): string | undefined {
  const normalized = value
    ?.toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  return normalized && normalized.length > 3 ? normalized : undefined;
}

export function promptLikelyContains(prompt: string, signal: string): boolean {
  const normalizedPrompt = normalizeActivationText(prompt);
  const terms = normalizeCandidateTerm(signal)
    ?.split(/\s+/)
    .filter((term) => term.length > 4 && !isAmbiguousDomainTerm(term))
    .slice(0, 4);
  if (!terms || terms.length === 0) return false;
  return terms.some((term) => normalizedPrompt.includes(` ${term} `));
}

export function isAmbiguousDomainTerm(term: string): boolean {
  return new Set([
    'draft',
    'content',
    'review',
    'research',
    'write',
    'writer',
    'brief',
    'analysis',
    'profile',
    'source',
    'notes',
  ]).has(term);
}

export function hasDeliverableIntent(normalizedPrompt: string): boolean {
  return /\b(write|draft|create|produce|build|generate|prepare|plan|outline|summarize|rewrite|compose)\b/i.test(
    normalizedPrompt
  );
}

export function hasResearchIntent(normalizedPrompt: string): boolean {
  return /\b(research|source|verify|fact|current|latest|crawl|search|fetch|evidence|citation|serp|market|news)\b/i.test(
    normalizedPrompt
  );
}

export function hasReviewIntent(normalizedPrompt: string): boolean {
  return /\b(review|audit|check|risk|score|evaluate|assess|red flag|claim|compliance|quality)\b/i.test(
    normalizedPrompt
  );
}

export function hasToolIntent(normalizedPrompt: string): boolean {
  return /\b(search|fetch|crawl|browser|file|database|calendar|email|publish|notion|airtable|github|analytics|web|source)\b/i.test(
    normalizedPrompt
  );
}

export function hasHighRiskIntent(normalizedPrompt: string): boolean {
  return /\b(legal|medical|health|finance|investment|tax|safety|compliance|regulated|claim|publish|schedule|send|delete|write)\b/i.test(
    normalizedPrompt
  );
}

export function isPromptUnderspecified(prompt: string): boolean {
  const words = prompt.trim().split(/\s+/).filter(Boolean);
  return (
    words.length < 18 ||
    /\b(help|create|write|review|analyze|make|draft)\s+(it|this|something|content|post|article|brief)\b/i.test(
      prompt
    )
  );
}

function legacyOrGenericSkillActivationMatch(
  skill: AgentSkill,
  prompt: string,
  normalizedPrompt: string
): SkillActivationMatch | undefined {
  const manifest = skill.skillMetadata?.creator;
  const terms = manifest ? creatorActivationTerms(manifest) : genericSkillActivationTerms(skill);
  return terms.find(
    (term) =>
      term.confidence >= AUTO_SKILL_ACTIVATION_MIN_CONFIDENCE &&
      normalizedPrompt.includes(term.term) &&
      !isNegatedActivation(prompt, term.term.trim())
  );
}

function domainSkillActivationMatch(
  skill: AgentSkill,
  prompt: string,
  normalizedPrompt: string
): SkillActivationMatch | undefined {
  const metadata = skill.skillMetadata;
  if (!metadata) return undefined;

  const exact = uniqueActivationTerms([
    { value: skill.name, reason: 'exact-alias', confidence: 0.93 },
    ...(skill.directive !== undefined
      ? [{ value: skill.directive, reason: 'exact-alias' as const, confidence: 0.92 }]
      : []),
  ]).find(
    (term) => normalizedPrompt.includes(term.term) && !isNegatedActivation(prompt, term.term.trim())
  );
  if (exact) return exact;

  const category = normalizeCandidateTerm(metadata.category);
  const domain = normalizeCandidateTerm(metadata.domain);
  const stage = metadata.stage;
  const categoryMatched = category !== undefined && normalizedPrompt.includes(` ${category} `);
  const domainMatched = domain !== undefined && normalizedPrompt.includes(` ${domain} `);
  if (categoryMatched && category !== undefined && isNegatedActivation(prompt, category)) {
    return undefined;
  }
  const stageMatched = stage !== undefined && hasStageIntent(stage, normalizedPrompt);
  const skillNameMatched = skillNameSignalTerms(skill.name, metadata.category).some((term) =>
    normalizedPrompt.includes(term)
  );
  const artifactMatched = [
    ...(metadata.consumesArtifacts ?? []),
    ...(metadata.producesArtifacts ?? []),
  ]
    .map(normalizeCandidateTerm)
    .filter((term): term is string => term !== undefined && !isAmbiguousDomainTerm(term))
    .some((term) => normalizedPrompt.includes(` ${term} `));
  const intelligenceMatched = [
    ...(metadata.domainIntelligence?.minimumInput ?? []),
    ...(metadata.domainIntelligence?.toolsAndDataSources ?? []),
    ...(metadata.domainIntelligence?.vocabulary ?? []),
    ...(metadata.domainIntelligence?.metricsAndSignals ?? []),
  ]
    .map(normalizeCandidateTerm)
    .filter(
      (term): term is string =>
        term !== undefined && term.length > 6 && !isAmbiguousDomainTerm(term)
    )
    .some((term) => normalizedPrompt.includes(` ${term} `));

  if ((categoryMatched || domainMatched) && stageMatched) {
    return {
      term: ` ${(categoryMatched ? category : domain) ?? skill.name} ${stage} `,
      reason: 'semantic',
      confidence: 0.86,
    };
  }
  if (categoryMatched && (skillNameMatched || artifactMatched || intelligenceMatched)) {
    return { term: ` ${category} `, reason: 'semantic', confidence: 0.83 };
  }
  if (domainMatched && skillNameMatched) {
    return { term: ` ${domain} `, reason: 'semantic', confidence: 0.8 };
  }
  if (stageMatched && skillNameMatched) {
    return { term: ` ${skill.name} `, reason: 'semantic', confidence: 0.79 };
  }
  if (artifactMatched && stageMatched) {
    return { term: ` ${stage} artifact `, reason: 'creator-artifact', confidence: 0.78 };
  }
  return undefined;
}

function creatorActivationTerms(manifest: CreatorSkillManifest): ActivationTerm[] {
  const terms: Array<{ readonly value?: string } & Omit<ActivationTerm, 'term'>> = [
    { value: manifest.name, reason: 'exact-alias', confidence: 0.92 },
    ...(manifest.directive !== undefined
      ? [{ value: manifest.directive, reason: 'exact-alias' as const, confidence: 0.9 }]
      : []),
    ...manifest.producesArtifacts.map((value) => ({
      value,
      reason: 'creator-artifact' as const,
      confidence: 0.82,
    })),
    ...flattenCapabilityExpressions(manifest.requiredCapabilities).map((value) => ({
      value,
      reason: 'capability' as const,
      confidence: 0.78,
    })),
    ...flattenCapabilityExpressions(manifest.optionalCapabilities).map((value) => ({
      value,
      reason: 'capability' as const,
      confidence: 0.72,
    })),
    ...creatorActivationAliases(manifest.name).map((value) => ({
      value,
      reason: 'keyword' as const,
      confidence: 0.84,
    })),
  ];
  return uniqueActivationTerms(terms);
}

function creatorActivationAliases(skillName: string): string[] {
  return CREATOR_SKILL_ACTIVATION_ALIASES[skillName] ?? [];
}

function genericSkillActivationTerms(skill: AgentSkill): ActivationTerm[] {
  const terms: Array<{ readonly value?: string } & Omit<ActivationTerm, 'term'>> = [
    { value: skill.name, reason: 'exact-alias', confidence: 0.9 },
    ...(skill.directive !== undefined
      ? [{ value: skill.directive, reason: 'exact-alias' as const, confidence: 0.88 }]
      : []),
    ...skill.name
      .split('-')
      .map((value) => ({ value, reason: 'keyword' as const, confidence: 0.74 })),
  ];
  return uniqueActivationTerms(terms);
}

function uniqueActivationTerms(
  values: readonly ({ readonly value?: string } & Omit<ActivationTerm, 'term'>)[]
): ActivationTerm[] {
  const stopWords = new Set(['and', 'for', 'the', 'with', 'skill', 'agent', 'content', 'creator']);
  const terms = new Map<string, ActivationTerm>();
  for (const candidate of values) {
    if (!candidate.value) continue;
    const normalized = candidate.value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
    if (
      normalized.length > 3 &&
      !stopWords.has(normalized) &&
      !isAmbiguousArtifactTerm(candidate.reason, normalized)
    ) {
      terms.set(` ${normalized} `, {
        term: ` ${normalized} `,
        reason: candidate.reason,
        confidence: candidate.confidence,
      });
    }
    if (
      candidate.reason === 'creator-artifact' ||
      candidate.reason === 'capability' ||
      candidate.reason === 'exact-alias'
    ) {
      continue;
    }
    for (const part of normalized.split(/\s+/)) {
      if (part.length > 3 && !stopWords.has(part)) {
        const term = ` ${part} `;
        if (!terms.has(term)) {
          terms.set(term, {
            term,
            reason: candidate.reason,
            confidence: Math.min(candidate.confidence, 0.72),
          });
        }
      }
    }
  }
  return [...terms.values()].sort((left, right) => right.confidence - left.confidence);
}

function skillNameSignalTerms(skillName: string, category: string | undefined): string[] {
  const categoryTerm = normalizeCandidateTerm(category);
  return skillName
    .split('-')
    .map(normalizeCandidateTerm)
    .filter((term): term is string => term !== undefined)
    .filter((term) => term !== categoryTerm && !isAmbiguousDomainTerm(term))
    .map((term) => ` ${term} `);
}

function hasStageIntent(stage: string, normalizedPrompt: string): boolean {
  switch (stage) {
    case 'context':
      return /\b(research|find|discover|investigate|learn|profile|analy[sz]e|scan|source|understand)\b/.test(
        normalizedPrompt
      );
    case 'strategy':
      return /\b(plan|strategy|brief|position|prioriti[sz]e|roadmap|map|decide|angle|outline)\b/.test(
        normalizedPrompt
      );
    case 'creation':
      return hasCreationIntent(normalizedPrompt);
    case 'review':
      return /\b(review|audit|check|verify|critique|risk|qa|improve|evaluate|red flag)\b/.test(
        normalizedPrompt
      );
    case 'operations':
      return /\b(schedule|calendar|publish|handoff|workflow|operate|track|status|report)\b/.test(
        normalizedPrompt
      );
    default:
      return false;
  }
}

function isAmbiguousArtifactTerm(reason: ActivationTerm['reason'], normalized: string): boolean {
  return reason === 'creator-artifact' && ['draft'].includes(normalized);
}

function trustedActivationText(value: string): string {
  const withoutFences = value.replace(/```[\s\S]*?```/g, ' ');
  return withoutFences
    .split('\n')
    .filter((line) => !/^\s*(retrieved|external|tool output|page content|source)\b/i.test(line))
    .join('\n');
}

function isNegatedActivation(prompt: string, term: string): boolean {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b(?:do not|don't|dont|avoid|without|no)\\b.{0,24}\\b${escaped}\\b`, 'i').test(
    prompt
  );
}

function shouldSkipAutoActivation(skillName: string, prompt: string): boolean {
  if (!CREATION_SKILL_NAMES.has(skillName)) return false;
  const normalized = prompt.toLowerCase();
  const creationIntent = hasCreationIntent(normalized);
  if (creationIntent) return false;
  return /\b(research|source|fact[- ]?check|verify|audit|review|analy[sz]e|audience|persona|objection)\b/.test(
    normalized
  );
}

function adjustedAutoSkillConfidence(
  skillName: string,
  prompt: string,
  matched: SkillActivationMatch
): number {
  if (!CREATION_SKILL_NAMES.has(skillName)) return matched.confidence;
  if (!hasCreationIntent(prompt.toLowerCase())) return matched.confidence;
  if (matched.reason === 'exact-alias' || matched.reason === 'keyword') {
    return Math.max(matched.confidence, 0.93);
  }
  return matched.confidence;
}

function hasCreationIntent(normalizedPrompt: string): boolean {
  return /\b(write|draft|compose|create|produce|generate|turn|make)\b/.test(normalizedPrompt);
}

const CREATION_SKILL_NAMES = new Set([
  'blog-writer',
  'copywriter',
  'video-scriptwriter',
  'book-writer',
  'newsletter-writer',
  'social-writer',
]);

const CREATOR_SKILL_ACTIVATION_ALIASES: Record<string, string[]> = {
  'audience-research': ['audience', 'reader', 'persona', 'segment', 'customer'],
  'content-positioning': ['positioning', 'angle', 'thesis', 'promise', 'differentiator'],
  'content-brief': ['brief', 'outline', 'plan', 'structure'],
  'research-synthesis': ['research', 'source', 'sources', 'evidence', 'synthesis'],
  'fact-check': ['fact', 'verify', 'claim', 'claims', 'citation'],
  'seo-strategy': ['seo', 'keyword', 'keywords', 'search intent'],
  'serp-brief': ['serp', 'ranking', 'competitor', 'search results'],
  'blog-writer': ['blog', 'article', 'post', 'medium', 'longform'],
  copywriter: ['copy', 'copywriting', 'landing page', 'conversion'],
  'video-scriptwriter': ['video', 'script', 'youtube', 'voiceover'],
  repurposing: ['repurpose', 'repurposing', 'thread', 'carousel', 'snippet'],
  'editorial-review': ['editorial', 'review', 'edit', 'clarity', 'coherence'],
  'competitor-analysis': ['competitor', 'competitive', 'comparison'],
  'trend-discovery': ['trend', 'trending', 'market signal'],
  'seo-audit': ['seo audit', 'technical seo', 'crawl issue'],
  'seo-review': ['seo review', 'metadata', 'meta description', 'slug'],
  'book-writer': ['book', 'chapter', 'manuscript'],
  'newsletter-writer': ['newsletter', 'email issue', 'subscriber'],
  'social-writer': ['social', 'linkedin', 'x post', 'tweet', 'caption'],
  'video-ideation': ['video idea', 'youtube idea', 'episode'],
  'creative-direction': ['creative direction', 'visual direction', 'concept'],
  'copy-review': ['copy review', 'conversion review', 'offer review'],
  'claim-risk-review': ['claim risk', 'legal risk', 'compliance'],
  'brand-voice': ['brand voice', 'tone', 'voice'],
  'publish-qa': ['publish', 'publishing', 'preflight', 'qa'],
  'content-calendar': ['calendar', 'schedule', 'editorial calendar'],
  'performance-analysis': ['performance', 'analytics', 'metrics'],
  'experiment-planner': ['experiment', 'a b test', 'hypothesis'],
};
