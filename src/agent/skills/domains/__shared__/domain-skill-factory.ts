import type { SkillSpec, SkillSpecExample } from '../../registries/skill-spec.js';
import { defineSkillSpec } from '../../registries/skill-validation.js';

// ─── Stage type ───────────────────────────────────────────────────────────────

export type DomainSkillStage = 'context' | 'strategy' | 'creation' | 'review' | 'operations';

// ─── Prompt interface ─────────────────────────────────────────────────────────
// Every field is required. The factory injects nothing — content is fully skill-owned.

export interface DomainSkillPrompt {
  /** Who the skill is and how it thinks. Fully skill-authored — no factory additions. */
  readonly role: string;
  /** What the skill produces in a single sentence. */
  readonly goal: string;
  /** Operating rules, risk boundaries, failure-mode avoidance. All skill-specific. */
  readonly constraints: readonly string[];
  /** When to use live tools, what to treat as untrusted, what requires approval. */
  readonly toolUsePolicy: readonly string[];
  /** Named output sections with label: description format. */
  readonly outputFormat: readonly string[];
  /** Pre-finalization verification items specific to this skill. */
  readonly qualityChecklist: readonly string[];
  /** 3 skill-specific recovery instructions for when the task cannot proceed. */
  readonly failureBehavior: readonly string[];
  /** 4–5 skill-specific safety rules covering injection, exposure, and regulated risk. */
  readonly safetyNotes: readonly string[];
}

// ─── Domain intelligence interface ───────────────────────────────────────────
// Metadata extension for domain skills. All fields skill-owned — no factory defaults.

export interface DomainSkillIntelligence {
  /** Domain/platform terms that sharpen this skill's output when used correctly. */
  readonly vocabulary: readonly string[];
  /** Quantitative signals this skill reads or produces. */
  readonly metrics: readonly string[];
  /** Tools and data sources this skill may consume. */
  readonly toolsAndDataSources: readonly string[];
  /** The smallest input set required before the skill can begin work. */
  readonly minimumInput: readonly string[];
  /** Skill-defined rules for when sourced data is stale. Not factory-computed. */
  readonly freshnessRules: readonly string[];
  /** Conditions that require human sign-off before output leaves the system. */
  readonly humanReviewTriggers: readonly string[];
  /** Domain-specific risk boundaries and claims that should never be crossed. */
  readonly riskBoundaries?: readonly string[];
  /** Notes that prevent decorative jargon, keyword stuffing, and fake expertise. */
  readonly antiStuffingNotes?: readonly string[];
}

// ─── Skill definition interface ───────────────────────────────────────────────

export interface DomainSkillDefinition {
  readonly name: string;
  /** Human-readable title used in display and skill registry. */
  readonly title: string;
  readonly description: string;
  /**
   * Short imperative action verb or phrase — not an echo of the skill name.
   * Good: 'audit', 'synthesize', 'draft', 'review-code'.
   * Bad: 'code-review', 'brand-research'.
   * The factory emits a warning when directive === name.
   */
  readonly directive: string;
  readonly domain: string;
  readonly category: string;
  readonly stage: DomainSkillStage;
  /** Routing weight. Omit to derive from stage (context=20 … operations=75). */
  readonly priority?: number;
  readonly requiredAdapters?: readonly string[];
  readonly optionalAdapters?: readonly string[];
  readonly sideEffectRisk?: SkillSpec['sideEffectRisk'];
  readonly sideEffectIntents?: SkillSpec['sideEffectIntents'];
  readonly consumesArtifacts: readonly string[];
  readonly producesArtifacts: readonly string[];
  readonly domainIntelligence: DomainSkillIntelligence;
  /**
   * All 8 prompt sections are required.
   * The factory passes them through verbatim — no injection, no fallback, no merging.
   */
  readonly prompt: DomainSkillPrompt;
  readonly examples?: readonly SkillSpecExample[];
}

// ─── Factory ──────────────────────────────────────────────────────────────────
// Pure structural assembler. The only logic here:
//   1. Warn when directive === name (bad naming).
//   2. Compute sideEffectRisk from explicit side-effect intents, then adapter lists.
//   3. Compute priority from stage when omitted.
//   4. Pass everything else through unchanged.

export function defineDomainSkillSpec(definition: DomainSkillDefinition): SkillSpec {
  if (definition.directive === definition.name) {
    console.warn(
      `[agentcraft] Domain skill '${definition.name}': directive is identical to name — ` +
        `set a short action verb instead (e.g. 'audit' not '${definition.name}').`,
    );
  }

  return defineSkillSpec({
    name: definition.name,
    displayName: definition.title,
    description: definition.description,
    directive: definition.directive,
    domain: definition.domain,
    category: definition.category,
    stage: definition.stage,
    priority: definition.priority ?? stagePriority(definition.stage),
    sideEffectRisk:
      definition.sideEffectRisk ??
      computeSideEffectRisk(definition),
    ...(definition.sideEffectIntents !== undefined && {
      sideEffectIntents: [...definition.sideEffectIntents],
    }),
    requiredCapabilities: [],
    requiredAdapters: [...(definition.requiredAdapters ?? [])],
    optionalAdapters: [...(definition.optionalAdapters ?? [])],
    consumesArtifacts: [...definition.consumesArtifacts],
    producesArtifacts: [...definition.producesArtifacts],
    ...(definition.examples !== undefined && { examples: definition.examples }),
    domainIntelligence: {
      vocabulary: [...definition.domainIntelligence.vocabulary],
      artifacts: {
        consumes: [...definition.consumesArtifacts],
        produces: [...definition.producesArtifacts],
      },
      metricsAndSignals: [...definition.domainIntelligence.metrics],
      toolsAndDataSources: [...definition.domainIntelligence.toolsAndDataSources],
      minimumInput: [...definition.domainIntelligence.minimumInput],
      freshnessRules: [...definition.domainIntelligence.freshnessRules],
      humanReviewTriggers: [...definition.domainIntelligence.humanReviewTriggers],
      ...(definition.domainIntelligence.riskBoundaries !== undefined && {
        riskBoundaries: [...definition.domainIntelligence.riskBoundaries],
      }),
      ...(definition.domainIntelligence.antiStuffingNotes !== undefined && {
        antiStuffingNotes: [...definition.domainIntelligence.antiStuffingNotes],
      }),
      ...(definition.domainIntelligence.antiStuffingNotes === undefined && {
        antiStuffingNotes: [
          'Use domain vocabulary only when it changes the decision, evidence, risk, or execution path.',
        ],
      }),
    },
    prompt: {
      role: definition.prompt.role,
      goal: definition.prompt.goal,
      constraints: [...definition.prompt.constraints],
      toolUsePolicy: [...definition.prompt.toolUsePolicy],
      outputFormat: [...definition.prompt.outputFormat],
      qualityChecklist: [...definition.prompt.qualityChecklist],
      failureBehavior: [...definition.prompt.failureBehavior],
      safetyNotes: [...definition.prompt.safetyNotes],
    },
  });
}

// ─── Structural helpers (no content) ─────────────────────────────────────────

function computeSideEffectRisk(definition: DomainSkillDefinition): 'none' | 'read' | 'write' | 'external' {
  const intentRisk = computeSideEffectRiskFromIntents(definition);
  if (intentRisk !== undefined) return intentRisk;

  const requiredAdapters = definition.requiredAdapters ?? [];
  const optionalAdapters = definition.optionalAdapters ?? [];
  const all = [...requiredAdapters, ...optionalAdapters];
  const writeCapable = new Set([
    'airtable-mcp',
    'apify',
    'apify-mcp',
    'browserbase-mcp',
    'database',
    'email',
    'github',
    'github-mcp',
    'gmail-mcp',
    'google-calendar',
    'google-sheets',
    'memory-mcp',
    'notion',
    'notion-mcp',
    'pinecone',
    'playwright',
    'playwright-mcp',
    'publishing',
    'redis',
    'slack',
    'slack-mcp',
    'storage',
    'supabase',
    'supabase-mcp',
  ]);
  const externalRead = new Set([
    'analytics',
    'brave-search-mcp',
    'fetch',
    'fetch-mcp',
    'firecrawl',
    'firecrawl-mcp',
    'link-checker',
    'seo',
    'storage',
    'supabase',
    'supabase-mcp',
    'tavily',
  ]);
  for (const a of requiredAdapters) {
    if (writeCapable.has(a)) return 'write';
  }
  const promptPolicyText = [
    ...definition.prompt.toolUsePolicy,
    ...definition.prompt.safetyNotes,
    ...definition.prompt.failureBehavior,
  ].join('\n');
  const optionalWriteIntent = /\b(write|save|persist|schedule|send|upload|delete|mutate|overwrite|append|publish(?:ing)? (?:draft|package|post|page|content)|create .*?(event|page|record|draft|file|artifact|row|ticket|message))\b/i.test(
    promptPolicyText,
  );
  if (optionalWriteIntent) {
    for (const a of optionalAdapters) {
      if (writeCapable.has(a)) return 'write';
    }
  }
  for (const a of all) {
    if (externalRead.has(a) || writeCapable.has(a)) return 'external';
  }
  return all.length > 0 ? 'read' : 'none';
}

function computeSideEffectRiskFromIntents(
  definition: DomainSkillDefinition,
): 'none' | 'read' | 'write' | 'external' | undefined {
  const intents = definition.sideEffectIntents ?? [];
  if (intents.length === 0) return undefined;
  if (
    intents.includes('external-write') ||
    intents.includes('publishes') ||
    intents.includes('approval-required')
  ) {
    return 'external';
  }
  if (intents.includes('writes-artifact') || intents.includes('writes-store')) return 'write';
  if (intents.includes('read-only')) {
    const adapters = [...(definition.requiredAdapters ?? []), ...(definition.optionalAdapters ?? [])];
    if (adapters.length === 0) return 'none';
    return adapters.some((adapter) => ['fetch', 'fetch-mcp', 'firecrawl', 'firecrawl-mcp', 'tavily'].includes(adapter))
      ? 'external'
      : 'read';
  }
  return undefined;
}

function stagePriority(stage: DomainSkillStage): number {
  switch (stage) {
    case 'context':    return 20;
    case 'strategy':   return 35;
    case 'creation':   return 45;
    case 'review':     return 65;
    case 'operations': return 75;
  }
}
