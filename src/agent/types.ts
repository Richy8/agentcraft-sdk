import type { IPromptLoader } from "../prompt-assembler/loaders/base.loader.js";
import type { ToolDefinition } from "../protocols/types.js";
import type {
  FinishReason,
  ModelCapabilities,
  ResponseFormat as ProviderResponseFormat,
  StreamChunk,
  ToolCall,
} from "../types/provider.types.js";
import type { CostOptions } from "../cost-calculator/index.js";
import type { Agent } from "./agent.js";
import type { AgentAdapter } from "./adapters/types.js";
import type { CreatorPack } from "./creator/types.js";
import type { ToolPolicy } from "./adapters/tool-policy.js";
import type { TraceSink, TraceSpan } from "./observability.js";
import type { AgentSkill } from "./skills/types.js";
import type { AgentWorkspaceInstance } from "./workspace.js";
import type {
  StructuredOutputOptions,
  StructuredOutputSchema,
} from "./structured-output.js";

export interface TokenUsage {
  prompt: number;
  completion: number;
  total: number;
}

export interface RetryConfig {
  maxAttempts: number;
  backoff: "exponential" | "linear" | "fixed";
  initialDelay: number;
  maxDelay: number;
}

export type ResponseFormat = ProviderResponseFormat;

export interface AgentImage {
  type: "base64" | "url";
  mediaType?: "image/png" | "image/jpeg" | "image/webp" | "image/gif";
  data: string;
}

export interface AgentAudio {
  type: "base64" | "url";
  mediaType?: "audio/mp3" | "audio/wav" | "audio/ogg";
  data: string;
}

export interface AgentVideo {
  type: "base64" | "url";
  mediaType?: "video/mp4" | "video/webm";
  data: string;
}

export interface AgentFile {
  type: "base64" | "url";
  filename: string;
  mediaType: string;
  data: string;
}

export interface AgentResponse {
  content: string;
  structuredResponse?: unknown;
  tokensUsed: TokenUsage;
  cost: number;
  finishReason: FinishReason;
  toolCalls?: ToolCall[];
  model: string;
  provider: string;
  runId?: string;
  trace?: unknown[];
  promptProvenance?: {
    source: "inline" | "file" | "dir";
    promptFile?: string;
    promptDir?: string;
    assembled: boolean;
  };
  selection?: {
    skillActivation: "always" | "auto" | "directive-only";
    toolSelection: "all" | "auto";
    activeSkills: string[];
    exposedTools: string[];
    executedToolCalls?: number;
  };
  cache?: {
    hits: number;
    misses: number;
    writes: number;
    bypassed: boolean;
    skippedUnsafe: number;
    stale: number;
    corrupt: number;
    oversized: number;
    toolCallsAvoided: number;
    estimatedSavedTokens: number;
  };
}

export interface CachePolicy {
  /**
   * Tool names that must have a cache hit before the run proceeds.
   * If any named tool has no cached result at tool-call time, the run fails
   * closed instead of executing the expensive tool.
   */
  requireCachedFor?: string[];
}

export interface RunBudget {
  maxRuns?: number;
  maxTokens?: number;
  maxInputTokens?: number;
  maxOutputTokens?: number;
  maxToolCalls?: number;
  maxCost?: number;
  costOptions?: CostOptions;
  cachePolicy?: CachePolicy;
}

export interface AgentRunParams {
  prompt?: string;
  promptFile?: string;
  /**
   * @deprecated Use promptFile to point at an explicit entry file, then compose
   * additional files with {{include path}} directives.
   */
  promptDir?: string;
  vars?: Record<string, unknown>;
  assembly?: {
    config?: Record<string, unknown>;
    strict?: boolean;
    minify?: boolean;
    maxPartialDepth?: number;
    rootDir?: string;
    allowOutsideRoot?: boolean;
    loader?: IPromptLoader;
  };
  system?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
  tools?: ToolDefinition[];
  /**
   * Attach skills, adapters, or creator packs for this run only.
   *
   * Use this when a tool/skill should be available to one prompt without
   * becoming part of the agent's global context or default tool surface.
   */
  use?: AgentRunAttachment | readonly AgentRunAttachment[];
  toolPolicy?: ToolPolicy;
  images?: AgentImage[];
  audio?: AgentAudio[];
  video?: AgentVideo[];
  files?: AgentFile[];
  responseFormat?: ResponseFormat;
  responseSchema?: StructuredOutputSchema;
  structuredOutput?: StructuredOutputOptions;
  signal?: AbortSignal;
  trace?: TraceSink | boolean;
  budget?: RunBudget;
  replay?: AgentResponse | { responses: AgentResponse[]; index?: number };
  cache?: false | { bypass?: boolean };
}

export type AgentRunAttachment = AgentAdapter | CreatorPack;

export interface AgentPoolOptions {
  strategy:
    | "cost"
    | "speed"
    | "quality"
    | "round-robin"
    | "random"
    | "best-fit";
  fallback?: Agent;
  fallbackMode?: "none" | "first-error" | "retryable" | "non-retryable" | "all";
  downgradeOnBudgetPressure?: boolean;
  upgradeOnQualityFailure?: boolean;
}

export interface ModelInfo {
  model: string;
  provider: string;
  capabilities: {
    contextWindow: number;
    maxOutput: number;
    vision: boolean;
    audio: boolean;
    video: boolean;
    files: boolean;
    tools: boolean;
    streaming: boolean;
    jsonMode: boolean;
  };
  pricing: {
    inputPerM: number;
    outputPerM: number;
    cachedDiscount?: number;
    perRequest?: number;
    currency?: string;
    sourceUrl?: string;
    updatedAt?: string;
    notes?: string;
  };
  scores: { quality: number; speed: number };
  optimizedFor: string[];
  deprecated: boolean;
  local: boolean;
}

export interface CatalogFilter {
  provider?: string;
  optimizedFor?: ModelCapabilities["optimizedFor"][number];
  minQuality?: number;
  minSpeed?: number;
  vision?: boolean;
  audio?: boolean;
  tools?: boolean;
  streaming?: boolean;
  deprecated?: boolean;
}

export type { StreamChunk };

export interface TeamMember {
  readonly role: string;
  readonly agent: Agent;
  readonly description?: string;
}

export interface AgentTeamConfig {
  readonly orchestrator: Agent;
  readonly members: TeamMember[];
  readonly supervisor?: Agent;
  readonly workspace?: AgentWorkspaceInstance;
  readonly rolePolicies?: Record<string, ToolPolicy>;
  /**
   * @deprecated Use workspace.adapters instead. When workspace is provided,
   * sharedAdapters is ignored with a warning.
   */
  readonly sharedAdapters?: AgentAdapter[];
  readonly sharedSkills?: AgentSkill[];
  /**
   * @deprecated Include memory as an MCP adapter in workspace.mcps instead.
   */
  readonly memory?: AgentAdapter;
  readonly executionHint?: "parallel" | "sequential" | "pipeline" | "auto";
  readonly maxRounds?: number;
  readonly maxRevisions?: number;
  readonly maxSupervisorReviews?: number;
  readonly onMemberError?: "retry" | "skip" | "fail";
  readonly mode?: "orchestrator" | "planner-executor-reviewer";
  readonly supervisorRubric?: string;
  readonly roleBudgets?: Record<string, RunBudget>;
}

export interface AgentTeamSpawnConfig {
  readonly root: Agent;
  readonly roleHints?: string[];
  readonly supervisor?: Agent;
  readonly workspace?: AgentWorkspaceInstance;
  readonly rolePolicies?: Record<string, ToolPolicy>;
  readonly memory?: AgentAdapter;
  readonly executionHint?: "parallel" | "sequential" | "pipeline" | "auto";
  readonly maxAgents?: number;
  readonly maxRounds?: number;
  readonly maxRevisions?: number;
  readonly maxSupervisorReviews?: number;
  readonly onMemberError?: "retry" | "skip" | "fail";
  readonly mode?: "orchestrator" | "planner-executor-reviewer";
  readonly supervisorRubric?: string;
  readonly roleBudgets?: Record<string, RunBudget>;
}

export interface TeamResponse extends AgentResponse {
  readonly rounds: number;
  readonly agentsUsed: number;
  readonly trace?: TeamTrace[];
  readonly traceSpans?: TraceSpan[];
}

export interface TeamTrace {
  readonly round: number;
  readonly agentRole: string;
  readonly input: string;
  readonly output: string;
  readonly cost: number;
  readonly tokensUsed: TokenUsage;
}
