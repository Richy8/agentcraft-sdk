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
const DEEP_ACTIVATION_THRESHOLD = 0.38;

export function selectActiveSkillMatches(input: {
  readonly params: AgentRunParams;
  readonly adapters: readonly AgentAdapter[];
  readonly mode: SkillActivationMode;
}): ActiveSkillMatch[] {
  const skills = input.adapters.filter(isAgentSkill);

  // Single skill on `always`: activate unconditionally — no routing overhead needed.
  if (input.mode === 'always' && skills.length <= 1) {
    return skills.map((skill) => ({ skill, reason: 'always', confidence: 1 }));
  }

  const prompt = trustedActivationText(input.params.prompt ?? '');
  const normalizedPrompt = normalizeActivationText(prompt);
  const directiveNames = new Set(
    Array.from(prompt.matchAll(/(?:^|\s)\/([a-zA-Z][\w-]*)/g)).map((match) => match[1]!)
  );

  if (input.mode === 'directive-only') {
    return skills.flatMap<ActiveSkillMatch>((skill) =>
      skill.directive && directiveNames.has(skill.directive)
        ? [{ skill, reason: 'directive' as const, confidence: 1, matched: `/${skill.directive}` }]
        : []
    );
  }

  const matches = autoRouteSkills(skills, prompt, normalizedPrompt, directiveNames);

  if (input.mode === 'always') {
    // Multiple skills on `always`: smart routing with a guaranteed floor so something always activates.
    if (matches.length > 0) return matches;
    const boost = boostUnderActivatedDomainSkills(skills, prompt, normalizedPrompt);
    if (boost.length > 0) return boost;
    const deep = deepActivationFallback(skills, prompt, normalizedPrompt);
    if (deep.length > 0) return deep;
    // Absolute fallback for non-domain or empty-prompt cases.
    return skills.map((skill) => ({ skill, reason: 'always', confidence: 1 }));
  }

  // `auto` mode: routing only, no guaranteed floor beyond the boost.
  if (matches.length > 0) return matches;
  const boost = boostUnderActivatedDomainSkills(skills, prompt, normalizedPrompt);
  if (boost.length > 0) return boost;
  return deepActivationFallback(skills, prompt, normalizedPrompt);
}

function autoRouteSkills(
  skills: readonly AgentSkill[],
  prompt: string,
  normalizedPrompt: string,
  directiveNames: ReadonlySet<string>
): ActiveSkillMatch[] {
  return skills
    .flatMap<ActiveSkillMatch>((skill) => {
      if (skill.directive && directiveNames.has(skill.directive)) {
        return [{ skill, reason: 'directive' as const, confidence: 1, matched: `/${skill.directive}` }];
      }
      const matched = skill.skillMetadata?.domain
        ? domainSkillActivationMatch(skill, prompt, normalizedPrompt)
        : legacyOrGenericSkillActivationMatch(skill, prompt, normalizedPrompt);
      return matched && !shouldSkipAutoActivation(skill, prompt)
        ? [
            {
              skill,
              reason: matched.reason,
              confidence: adjustedAutoSkillConfidence(skill, prompt, matched),
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
  const categoryAlias = matchedRouteAlias(metadata.domain, metadata.category, normalizedPrompt);
  const domainAlias = matchedDomainAlias(metadata.domain, normalizedPrompt);
  const categoryExactMatched = category !== undefined && normalizedPrompt.includes(` ${category} `);
  const categoryMatched = categoryExactMatched || categoryAlias !== undefined;
  const domainMatched =
    (domain !== undefined && normalizedPrompt.includes(` ${domain} `)) ||
    domainAlias !== undefined;
  const matchedCategoryTerm = categoryAlias ?? category;
  const matchedDomainTerm = domainAlias ?? domain;
  if (categoryMatched && matchedCategoryTerm !== undefined && isNegatedActivation(prompt, matchedCategoryTerm)) {
    return undefined;
  }
  const stageMatched = stage !== undefined && hasStageIntent(stage, normalizedPrompt);
  const skillNameMatched = skillNameSignalTerms(skill.name, metadata.category).some((term) =>
    normalizedPrompt.includes(term)
  );
  const artifactMatched = artifactRouteMatched(metadata, normalizedPrompt);
  const intelligenceMatched = domainIntelligenceRouteMatched(
    metadata.domainIntelligence,
    normalizedPrompt
  );

  const aliasOnlyNeedsSkillSignal =
    !categoryExactMatched &&
    categoryAlias !== undefined &&
    (stage === 'context' || stage === 'review' || stage === 'operations') &&
    !skillNameMatched &&
    !artifactMatched &&
    !intelligenceMatched;

  if ((categoryMatched || domainMatched) && stageMatched && !aliasOnlyNeedsSkillSignal) {
    return {
      term: ` ${(categoryMatched ? matchedCategoryTerm : matchedDomainTerm) ?? skill.name} ${stage} `,
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

function artifactRouteMatched(
  metadata: NonNullable<AgentSkill['skillMetadata']>,
  normalizedPrompt: string
): boolean {
  return [
    ...(metadata.consumesArtifacts ?? []),
    ...(metadata.producesArtifacts ?? []),
  ]
    .map(normalizeCandidateTerm)
    .filter((term): term is string => term !== undefined && !isAmbiguousDomainTerm(term))
    .some((term) => normalizedPrompt.includes(` ${term} `));
}

function domainIntelligenceRouteMatched(
  intelligence: NonNullable<AgentSkill['skillMetadata']>['domainIntelligence'],
  normalizedPrompt: string
): boolean {
  if (!intelligence) return false;
  return [
    ...(intelligence.minimumInput ?? []),
    ...(intelligence.toolsAndDataSources ?? []),
    ...(intelligence.vocabulary ?? []),
    ...(intelligence.metricsAndSignals ?? []),
  ]
    .map(normalizeCandidateTerm)
    .filter(
      (term): term is string =>
        term !== undefined && term.length > 6 && !isAmbiguousDomainTerm(term)
    )
    .some((term) => normalizedPrompt.includes(` ${term} `));
}

function matchedRouteAlias(
  domain: string | undefined,
  category: string | undefined,
  normalizedPrompt: string
): string | undefined {
  const aliases = DOMAIN_CATEGORY_ROUTE_ALIASES[`${domain ?? ''}:${category ?? ''}`] ?? [];
  return aliases
    .map(normalizeCandidateTerm)
    .filter((term): term is string => term !== undefined)
    .sort((left, right) => right.length - left.length)
    .find((term) => normalizedPrompt.includes(` ${term} `));
}

function matchedDomainAlias(
  domain: string | undefined,
  normalizedPrompt: string
): string | undefined {
  const aliases = DOMAIN_ROUTE_ALIASES[domain ?? ''] ?? [];
  return aliases
    .map(normalizeCandidateTerm)
    .filter((term): term is string => term !== undefined)
    .sort((left, right) => right.length - left.length)
    .find((term) => normalizedPrompt.includes(` ${term} `));
}

function boostUnderActivatedDomainSkills(
  skills: readonly AgentSkill[],
  prompt: string,
  normalizedPrompt: string
): ActiveSkillMatch[] {
  const domainSkills = skills.filter((skill) => skill.skillMetadata?.domain);
  if (domainSkills.length === 0 || isPromptUnderspecified(prompt)) return [];

  const threshold = underActivationThreshold(domainSkills.length);
  const candidates = domainSkills
    .map((skill) => ({
      skill,
      score: scoreDomainSkillRoute(skill, normalizedPrompt),
    }))
    .filter((candidate) => candidate.score >= threshold && !shouldSkipAutoActivation(candidate.skill, prompt))
    .sort((left, right) => {
      const priorityDelta = (right.skill.skillMetadata?.priority ?? 0) - (left.skill.skillMetadata?.priority ?? 0);
      if (Math.abs(right.score - left.score) < 0.03 && priorityDelta !== 0) return priorityDelta;
      return right.score - left.score;
    })
    .slice(0, underActivationBoostCap(domainSkills.length));

  // This is intentionally a last-resort route, not a normal selector. It avoids
  // the silent failure mode where a well-scoped pack is attached but no skill
  // crosses the strict semantic threshold because the prompt used a nearby term
  // such as "article" instead of the category name "blog".
  return candidates.map((candidate) => ({
    skill: candidate.skill,
    reason: 'semantic' as const,
    confidence: candidate.score,
    matched: 'under-activation-boost',
  }));
}

function scoreDomainSkillRoute(skill: AgentSkill, normalizedPrompt: string): number {
  const metadata = skill.skillMetadata;
  if (!metadata) return 0;

  let score = 0;
  const categoryAlias = matchedRouteAlias(metadata.domain, metadata.category, normalizedPrompt);
  const domainAlias = matchedDomainAlias(metadata.domain, normalizedPrompt);
  const category = normalizeCandidateTerm(metadata.category);
  const domain = normalizeCandidateTerm(metadata.domain);
  if (category !== undefined && normalizedPrompt.includes(` ${category} `)) score += 0.36;
  if (categoryAlias !== undefined) score += categoryAlias.includes(' ') ? 0.34 : 0.28;
  if (domain !== undefined && normalizedPrompt.includes(` ${domain} `)) score += 0.16;
  if (domainAlias !== undefined) score += 0.14;
  if (metadata.stage !== undefined && hasStageIntent(metadata.stage, normalizedPrompt)) score += 0.28;

  const skillSignals = skillNameSignalTerms(skill.name, metadata.category);
  const matchedSkillSignals = skillSignals.filter((term) => normalizedPrompt.includes(term)).length;
  score += Math.min(0.22, matchedSkillSignals * 0.11);

  if (skill.directive !== undefined && normalizedPrompt.includes(` ${normalizeCandidateTerm(skill.directive) ?? ''} `)) {
    score += 0.22;
  }

  if (domainIntelligenceRouteMatched(metadata.domainIntelligence, normalizedPrompt)) score += 0.18;
  if (artifactRouteMatched(metadata, normalizedPrompt)) score += 0.14;
  return Math.min(0.9, score);
}

function underActivationThreshold(skillCount: number): number {
  if (skillCount <= 3) return 0.56;
  if (skillCount <= 6) return 0.62;
  return 0.68;
}

function underActivationBoostCap(skillCount: number): number {
  if (skillCount <= 3) return 1;
  if (skillCount <= 6) return 2;
  return 3;
}

function deepActivationFallback(
  skills: readonly AgentSkill[],
  prompt: string,
  normalizedPrompt: string
): ActiveSkillMatch[] {
  // Strategy 1: sub-threshold domain rescue.
  // Gated on underspecified because sub-threshold domain scores on short vague prompts
  // are noise. Adjacent-vocabulary cases only arise in reasonably long prompts.
  if (!isPromptUnderspecified(prompt)) {
    const domainSkills = skills.filter((skill) => skill.skillMetadata?.domain);
    const bestDomain = domainSkills
      .filter((skill) => !shouldSkipAutoActivation(skill, prompt))
      .map((skill) => ({ skill, score: scoreDomainSkillRoute(skill, normalizedPrompt) }))
      .filter((candidate) => candidate.score >= DEEP_ACTIVATION_THRESHOLD)
      .sort((left, right) => right.score - left.score)[0];
    if (bestDomain) {
      return [{
        skill: bestDomain.skill,
        reason: 'deep-boost',
        confidence: bestDomain.score,
        matched: 'deep-domain-rescue',
      }];
    }
  }

  // Strategy 2: primitive intent fallback.
  // Only gates on the vague-pattern check, not word count — a short but specific prompt
  // ("draft a summary of these notes") has clear intent and should reach a primitive.
  const isVaguePattern = /\b(help|create|write|review|analyze|make|draft)\s+(it|this|something|content|post|article|brief)\b/i.test(prompt);
  if (!isVaguePattern) {
    const primitiveSkills = skills.filter((skill) => !skill.skillMetadata?.domain);
    const primitive = selectPrimitiveByIntent(primitiveSkills, prompt, normalizedPrompt);
    if (primitive) {
      return [{
        skill: primitive,
        reason: 'deep-boost',
        confidence: DEEP_ACTIVATION_THRESHOLD,
        matched: 'primitive-intent',
      }];
    }
  }

  return [];
}

// Maps prompt intent signals to the built-in primitive directives they correspond to.
// Order within each intent list encodes preference (most specific first).
const PRIMITIVE_INTENT_DIRECTIVES: ReadonlyArray<{
  readonly test: (prompt: string, normalizedPrompt: string) => boolean;
  readonly directives: readonly string[];
}> = [
  {
    test: (_p, n) => hasResearchIntent(n),
    directives: ['investigate-deep', 'investigate'],
  },
  {
    test: (p, n) => hasCreationIntent(p.toLowerCase()) || hasDeliverableIntent(n),
    directives: ['write', 'draft-personal-email'],
  },
  {
    test: (_p, n) => hasReviewIntent(n),
    directives: ['audit', 'extract'],
  },
  {
    test: (_p, n) => /\b(analy[sz]e|analysis|data|metrics|report|measure|chart|trend)\b/i.test(n),
    directives: ['analyze', 'extract'],
  },
];

function selectPrimitiveByIntent(
  primitives: readonly AgentSkill[],
  prompt: string,
  normalizedPrompt: string
): AgentSkill | undefined {
  if (primitives.length === 0) return undefined;
  const byDirective = new Map(primitives.map((skill) => [skill.directive, skill]));
  for (const { test, directives } of PRIMITIVE_INTENT_DIRECTIVES) {
    if (!test(prompt, normalizedPrompt)) continue;
    for (const directive of directives) {
      const match = byDirective.get(directive);
      if (match && !shouldSkipAutoActivation(match, prompt)) return match;
    }
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
  ];
  return uniqueActivationTerms(terms);
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

function shouldSkipAutoActivation(skill: AgentSkill, prompt: string): boolean {
  if (!isCreationSkill(skill)) return false;
  const normalized = prompt.toLowerCase();
  const creationIntent = hasCreationIntent(normalized);
  if (creationIntent) return false;
  return /\b(research|source|fact[- ]?check|verify|audit|review|analy[sz]e|audience|persona|objection)\b/.test(
    normalized
  );
}

function adjustedAutoSkillConfidence(
  skill: AgentSkill,
  prompt: string,
  matched: SkillActivationMatch
): number {
  if (!isCreationSkill(skill)) return matched.confidence;
  if (!hasCreationIntent(prompt.toLowerCase())) return matched.confidence;
  if (matched.reason === 'exact-alias' || matched.reason === 'keyword') {
    return Math.max(matched.confidence, 0.93);
  }
  return matched.confidence;
}

function hasCreationIntent(normalizedPrompt: string): boolean {
  return /\b(write|draft|compose|create|produce|generate|turn|make)\b/.test(normalizedPrompt);
}

function isCreationSkill(skill: AgentSkill): boolean {
  return skill.skillMetadata?.stage === 'creation';
}

const DOMAIN_ROUTE_ALIASES: Record<string, readonly string[]> = {
  brand: ['brand', 'positioning', 'messaging', 'audience', 'voice'],
  business: ['business', 'strategy', 'operations', 'partnership', 'investment'],
  creator: ['creator', 'content', 'post', 'article', 'video', 'newsletter'],
  'data-analytics': ['analytics', 'metric', 'dashboard', 'experiment', 'cohort'],
  engineering: ['code', 'system', 'architecture', 'debug', 'deployment'],
  finance: ['finance', 'stock', 'equity', 'portfolio', 'market'],
  healthcare: ['healthcare', 'clinical', 'medical', 'patient'],
  legal: ['legal', 'contract', 'compliance', 'policy'],
  marketing: ['marketing', 'seo', 'campaign', 'ad', 'email', 'landing page'],
  'personal-productivity': ['productivity', 'task', 'calendar', 'life admin', 'weekly plan', 'time block'],
  product: ['product', 'prd', 'roadmap', 'launch', 'ux'],
  sales: ['sales', 'prospect', 'lead', 'deal', 'account'],
  support: ['support', 'ticket', 'customer', 'refund', 'escalation'],
};

const DOMAIN_CATEGORY_ROUTE_ALIASES: Record<string, readonly string[]> = {
  'brand:research': ['brand research', 'audience research', 'audience insight', 'customer language'],
  'brand:positioning': ['brand positioning', 'positioning', 'differentiation', 'moat'],
  'brand:messaging': ['messaging', 'tagline', 'proof point', 'brand story'],
  'brand:voice': ['brand voice', 'tone of voice', 'voice guide', 'style guide'],
  'creator:blog': ['blog', 'blog post', 'blog article', 'article', 'longform', 'longform article'],
  'creator:book': ['book', 'chapter', 'manuscript'],
  'creator:course': ['course', 'lesson', 'curriculum'],
  'creator:facebook': ['facebook', 'facebook post', 'facebook group'],
  'creator:instagram': ['instagram', 'caption', 'carousel', 'reel'],
  'creator:linkedin': ['linkedin', 'linkedin post', 'carousel'],
  'creator:medium': ['medium', 'medium article', 'medium essay', 'medium story', 'publication'],
  'creator:newsletter': ['newsletter', 'email issue', 'subject line'],
  'creator:pinterest': ['pinterest', 'pin', 'board'],
  'creator:podcast': ['podcast', 'episode', 'show notes'],
  'creator:resume': ['resume', 'cv', 'cover letter', 'ats'],
  'creator:short-video': ['short video', 'shorts', 'reel', 'clip'],
  'creator:snapchat': ['snapchat', 'snap', 'lens', 'ar filter'],
  'creator:substack': ['substack', 'paid free', 'community thread'],
  'creator:tiktok': ['tiktok', 'hook', 'shot list'],
  'creator:webinar': ['webinar', 'live training', 'slide brief'],
  'creator:x-twitter': ['x', 'twitter', 'tweet', 'thread'],
  'creator:youtube': ['youtube', 'thumbnail', 'chapter', 'description tags'],
  'data-analytics:dashboard': ['dashboard', 'metric definition', 'kpi dashboard'],
  'data-analytics:experiment-analysis': ['experiment', 'ab test', 'a b test', 'causality', 'readout'],
  'data-analytics:reporting': ['metric summary', 'executive data brief', 'anomaly', 'cohort'],
  'finance:stock-research': ['stock', 'stocks', 'equity', 'earnings', 'valuation', 'catalyst'],
  'finance:market-update': ['market update', 'macro', 'macro news', 'weekly update', 'market narrative'],
  'finance:market-research': ['sector rotation', 'country market', 'currency risk', 'currency brief'],
  'finance:portfolio-review': ['portfolio', 'allocation', 'exposure', 'drift'],
  'finance:investment-opportunity': ['opportunity', 'investment thesis', 'private market'],
  'finance:financial-reporting': ['finance summary', 'variance', 'budget', 'cash flow'],
  'healthcare:clinical-admin': ['clinical note', 'intake', 'referral', 'care plan'],
  'healthcare:medical-research': ['medical literature', 'clinical guideline', 'evidence grade'],
  'healthcare:patient-education': ['patient education', 'plain language', 'care instruction'],
  'marketing:ads': ['ad', 'ads', 'creative brief', 'ad copy'],
  'marketing:campaign': ['campaign', 'asset planner', 'campaign calendar'],
  'marketing:competitor-intelligence': ['competitor', 'competitive', 'offer review', 'gap synthesis'],
  'marketing:digital-marketing': ['digital marketing', 'channel mix', 'funnel', 'attribution'],
  'marketing:email-marketing': ['email marketing', 'email sequence', 'subject line'],
  'marketing:landing-page': ['landing page', 'conversion page', 'wireframe brief'],
  'marketing:seo': ['seo', 'serp', 'organic search', 'keyword', 'internal link'],
  'personal-productivity:weekly-planning': ['weekly plan', 'weekly planning', 'time block', 'time blocking', 'weekly schedule'],
  'product:launch': ['launch', 'release note', 'rollout'],
  'product:prd': ['prd', 'product requirements', 'user story', 'acceptance criteria'],
  'product:product-research': ['product research', 'user problem', 'jtbd', 'feedback'],
  'product:roadmap': ['roadmap', 'rice score', 'dependency map'],
  'product:ux-research': ['ux research', 'interview guide', 'usability', 'persona'],
  'sales:account-research': ['account research', 'stakeholder map', 'buying committee'],
  'sales:crm': ['crm', 'deal', 'pipeline', 'forecast'],
  'sales:objection-handling': ['objection', 'competitive objection', 'call coach'],
  'sales:proposal': ['proposal', 'pricing rationale', 'red team'],
  'sales:prospecting': ['prospect', 'lead', 'account fit', 'outreach'],
  'support:customer-success': ['customer success', 'renewal', 'qbr', 'churn'],
  'support:customer-support': ['ticket', 'refund', 'support response', 'escalation'],
  'support:knowledge-base': ['knowledge base', 'kb', 'support macro'],
};
