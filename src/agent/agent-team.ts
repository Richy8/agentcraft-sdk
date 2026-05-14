import { ConfigurationError } from '../errors/index.js';
import type { ToolDefinition } from '../protocols/types.js';
import type { StreamChunk } from '../types/provider.types.js';
import { Agent } from './agent.js';
import type { AgentAdapter } from './adapters/types.js';
import type {
  AgentRunParams,
  AgentTeamConfig,
  AgentTeamSpawnConfig,
  TeamMember,
  TeamResponse,
  TeamTrace,
} from './types.js';
import type { ToolPolicy } from './adapters/tool-policy.js';
import type { AgentWorkspaceInstance } from './workspace.js';
import { RunTracer, type TraceSink } from './observability.js';
import { resolvePrompt } from './utils/resolve-prompt.js';

const DEFAULT_MAX_ROUNDS = 10;
const DEFAULT_MAX_REVISIONS = 3;
const DEFAULT_MAX_SUPERVISOR_REVIEWS = 2;
const DEFAULT_MAX_AGENTS = 5;

interface NormalizedTeamConfig {
  orchestrator: Agent;
  members: TeamMember[];
  supervisor?: Agent;
  workspace?: AgentWorkspaceInstance;
  rolePolicies: Record<string, ToolPolicy>;
  sharedAdapters: AgentAdapter[];
  memory?: AgentAdapter;
  executionHint?: 'parallel' | 'sequential' | 'pipeline' | 'auto';
  maxRounds: number;
  maxRevisions: number;
  maxSupervisorReviews: number;
  onMemberError: 'retry' | 'skip' | 'fail';
  mode: 'orchestrator' | 'planner-executor-reviewer';
  supervisorRubric?: string;
  roleBudgets: Record<string, NonNullable<AgentRunParams['budget']>>;
}

export class AgentTeam {
  private readonly cleanupHandlers: { cleanup: () => void };
  private readonly sharedLifecycle: AgentAdapter[];
  private disposed = false;
  private initialized = false;

  private constructor(private readonly config: NormalizedTeamConfig, private readonly spawnConfig?: AgentTeamSpawnConfig) {
    this.sharedLifecycle = this.sortAdapters(this.collectSharedAdapters());
    for (const agent of this.allAgents()) {
      agent.markAdaptersExternallyManaged(this.sharedLifecycle);
    }

    const cleanup = () => {
      void this.dispose();
    };
    process.once('beforeExit', cleanup);
    process.once('SIGINT', cleanup);
    process.once('SIGTERM', cleanup);
    this.cleanupHandlers = { cleanup };
  }

  static create(config: AgentTeamConfig): AgentTeam {
    if (config.members.length === 0) {
      throw new ConfigurationError('AgentTeam requires at least one member');
    }

    const allAgents = [config.orchestrator, ...config.members.map((member) => member.agent)];
    if (config.supervisor) allAgents.push(config.supervisor);

    if (config.workspace) {
      applyWorkspaceToAgents(config.workspace, allAgents);
      for (const agent of allAgents) {
        for (const skill of config.sharedSkills ?? []) agent.use(skill);
      }
      if (config.sharedAdapters?.length) {
        console.warn(
          '[AgentCraft] AgentTeam: workspace is present; sharedAdapters is deprecated and has been ignored. Move adapters to workspace.adapters.',
        );
      }
      if (config.memory) {
        console.warn(
          '[AgentCraft] AgentTeam: workspace is present; memory is deprecated. Add memory MCP to workspace.mcps instead.',
        );
      }
    } else {
      for (const member of config.members) {
        for (const adapter of config.sharedAdapters ?? []) member.agent.use(adapter);
        for (const skill of config.sharedSkills ?? []) member.agent.use(skill);
      }
      for (const adapter of config.sharedAdapters ?? []) config.orchestrator.use(adapter);
      for (const skill of config.sharedSkills ?? []) config.orchestrator.use(skill);
      if (config.memory) config.orchestrator.use(config.memory);
    }

    if (config.rolePolicies) {
      for (const member of config.members) {
        member.agent.mergeToolPolicy(config.rolePolicies[member.role]);
      }
    }

    return new AgentTeam(normalizeCreateConfig(config));
  }

  static spawn(config: AgentTeamSpawnConfig): AgentTeam {
    const initialAgents = [config.root, ...(config.supervisor ? [config.supervisor] : [])];
    if (config.workspace) applyWorkspaceToAgents(config.workspace, initialAgents);
    config.root.mergeToolPolicy(config.rolePolicies?.orchestrator);
    config.supervisor?.mergeToolPolicy(config.rolePolicies?.supervisor);

    return new AgentTeam(
      normalizeCreateConfig({
        orchestrator: config.root,
        members: [],
        ...(config.supervisor !== undefined && { supervisor: config.supervisor }),
        ...(config.workspace !== undefined && { workspace: config.workspace }),
        ...(config.rolePolicies !== undefined && { rolePolicies: config.rolePolicies }),
        ...(config.memory !== undefined && { memory: config.memory }),
        ...(config.executionHint !== undefined && { executionHint: config.executionHint }),
        ...(config.maxRounds !== undefined && { maxRounds: config.maxRounds }),
        ...(config.maxRevisions !== undefined && { maxRevisions: config.maxRevisions }),
        ...(config.maxSupervisorReviews !== undefined && { maxSupervisorReviews: config.maxSupervisorReviews }),
        ...(config.onMemberError !== undefined && { onMemberError: config.onMemberError }),
        ...(config.mode !== undefined && { mode: config.mode }),
        ...(config.supervisorRubric !== undefined && { supervisorRubric: config.supervisorRubric }),
        ...(config.roleBudgets !== undefined && { roleBudgets: config.roleBudgets }),
      }),
      config
    );
  }

  async run(params: AgentRunParams): Promise<TeamResponse> {
    const traceInput = params.trace ?? this.config.workspace?.traceSink;
    const tracer = new RunTracer(toTeamTraceSink(traceInput));
    const teamSpan = tracer.start('team', 'team.run', { members: this.config.members.length });
    const resolvedPrompt = await resolvePrompt(params);
    if (this.spawnConfig && this.config.members.length === 0) {
      const spawnSpan = tracer.start('team', 'team.spawn', undefined, teamSpan.spanId);
      try {
        await this.runSpawnPhase(resolvedPrompt);
        tracer.end(spawnSpan);
      } catch (error) {
        tracer.end(spawnSpan, error);
        tracer.end(teamSpan, error);
        throw error;
      }
    }
    await this.initSharedAdapters();

    const trace: TeamTrace[] = [];
    const total = { cost: 0 };
    const agentsUsed = new Set<string>();
    const callCounts = new Map<string, number>();
    const parallelContext = this.config.executionHint === 'parallel'
      ? await this.runParallelMembers(resolvedPrompt, trace, traceInput === true, total, agentsUsed, tracer, teamSpan.spanId)
      : '';
    const orchestratorSpan = tracer.start('team', 'team.orchestrator', { round: 1, role: 'orchestrator' }, teamSpan.spanId);
    let finalResponse = await this.config.orchestrator.run({
      ...params,
      prompt: this.buildOrchestratorPrompt(resolvedPrompt, parallelContext),
      tools: parallelContext
        ? []
        : this.memberTools(1, trace, traceInput === true, total, agentsUsed, callCounts, tracer, teamSpan.spanId),
      ...withBudget(this.roleBudget('orchestrator', params.budget)),
    });
    tracer.end(orchestratorSpan);
    total.cost += finalResponse.cost;
    pushTrace(trace, traceInput === true, 1, 'orchestrator', resolvedPrompt, finalResponse);

    let rounds = 1;
    while (rounds < this.config.maxRounds && finalResponse.finishReason === 'tool_calls') {
      rounds++;
      const nextOrchestratorSpan = tracer.start('team', 'team.orchestrator', { round: rounds, role: 'orchestrator' }, teamSpan.spanId);
      finalResponse = await this.config.orchestrator.run({
        prompt: `Continue orchestration for the task. Prior result:\n${finalResponse.content}`,
        tools: this.memberTools(rounds, trace, traceInput === true, total, agentsUsed, callCounts, tracer, teamSpan.spanId),
        ...withBudget(this.roleBudget('orchestrator', params.budget)),
      });
      tracer.end(nextOrchestratorSpan);
      total.cost += finalResponse.cost;
      pushTrace(trace, traceInput === true, rounds, 'orchestrator', finalResponse.content, finalResponse);
    }

    finalResponse = await this.reviewWithSupervisor(resolvedPrompt, finalResponse, trace, traceInput === true, total, tracer, teamSpan.spanId);

    const { trace: _agentTrace, ...teamResponseBase } = finalResponse;
    tracer.end(teamSpan);
    return {
      ...teamResponseBase,
      cost: total.cost,
      rounds,
      agentsUsed: agentsUsed.size,
      ...(traceInput ? { trace } : {}),
      ...(traceInput ? { traceSpans: tracer.export() } : {}),
    };
  }

  async *stream(params: AgentRunParams): AsyncGenerator<StreamChunk> {
    const response = await this.run(params);
    yield {
      delta: response.content,
      finishReason: response.finishReason,
      usage: response.tokensUsed,
    };
  }

  async dispose(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;
    process.off('beforeExit', this.cleanupHandlers.cleanup);
    process.off('SIGINT', this.cleanupHandlers.cleanup);
    process.off('SIGTERM', this.cleanupHandlers.cleanup);

    for (const adapter of [...this.sharedLifecycle].reverse()) {
      if (adapter.cleanup) await adapter.cleanup();
    }
    for (const agent of this.allAgents().reverse()) {
      await agent.dispose();
    }
  }

  private memberTools(
    round: number,
    trace: TeamTrace[],
    traceEnabled: boolean,
    total: { cost: number },
    agentsUsed: Set<string>,
    callCounts: Map<string, number>,
    tracer?: RunTracer,
    parentSpanId?: string
  ): ToolDefinition[] {
    return this.config.members.map((member) => ({
      name: `invoke_${sanitizeRole(member.role)}`,
      description: member.description ?? `Invoke the ${member.role} team member`,
      parameters: {
        type: 'object',
        properties: {
          task: { type: 'string', description: 'Task for the team member' },
          context: { type: 'string', description: 'Relevant context for the team member' },
        },
        required: ['task'],
      },
      execute: async (args) => {
        const memberSpan = tracer?.start('team', `team.member.${member.role}`, { round, role: member.role }, parentSpanId);
        const count = callCounts.get(member.role) ?? 0;
        if (count >= this.config.maxRevisions) {
          if (memberSpan) tracer!.end(memberSpan);
          return `${member.role} may not be called again - maxRevisions reached. Proceed with available work.`;
        }

        callCounts.set(member.role, count + 1);
        const input = [String(args.task ?? ''), args.context ? `Context:\n${String(args.context)}` : '']
          .filter(Boolean)
          .join('\n\n');

        try {
          const response = await member.agent.run({ prompt: input, ...withBudget(this.roleBudget(member.role)) });
          total.cost += response.cost;
          agentsUsed.add(member.role);
          pushTrace(trace, traceEnabled, round, member.role, input, response);
          if (memberSpan) tracer!.end(memberSpan);
          return response.content;
        } catch (err) {
          if (this.config.onMemberError === 'fail') throw err;
          if (this.config.onMemberError === 'retry') {
            const response = await member.agent.run({ prompt: input, ...withBudget(this.roleBudget(member.role)) });
            total.cost += response.cost;
            agentsUsed.add(member.role);
            pushTrace(trace, traceEnabled, round, member.role, input, response);
            if (memberSpan) tracer!.end(memberSpan);
            return response.content;
          }
          if (memberSpan) tracer!.end(memberSpan, err);
          return `${member.role} failed and was skipped: ${(err as Error).message}`;
        }
      },
    }));
  }

  private async reviewWithSupervisor(
    originalTask: string,
    draft: TeamResponse | Awaited<ReturnType<Agent['run']>>,
    trace: TeamTrace[],
    traceEnabled: boolean,
    total: { cost: number },
    tracer?: RunTracer,
    parentSpanId?: string
  ) {
    if (!this.config.supervisor) return draft;

    let approved = false;
    let feedback = '';
    let current = draft;
    for (let review = 1; review <= this.config.maxSupervisorReviews; review++) {
      const supervisorSpan = tracer?.start('team', 'team.supervisor', { review, role: 'supervisor' }, parentSpanId);
      const tools: ToolDefinition[] = [
        {
          name: 'approve_output',
          description: 'Approve the final output.',
          parameters: { type: 'object', properties: {}, required: [] },
          execute: async () => {
            approved = true;
            return 'approved';
          },
        },
        {
          name: 'request_revision',
          description: 'Request a revision with actionable feedback.',
          parameters: {
            type: 'object',
            properties: { feedback: { type: 'string', description: 'Specific revision feedback' } },
            required: ['feedback'],
          },
          execute: async (args) => {
            feedback = String(args.feedback ?? '');
            return 'revision requested';
          },
        },
      ];

      const supervisorResponse = await this.config.supervisor.run({
        prompt: `Original task:\n${originalTask}\n\nDraft:\n${current.content}`,
        system: [
          'Review the draft against the original task. Call approve_output if it meets the standard, or request_revision with specific actionable feedback if it does not.',
          this.config.supervisorRubric ? `Rubric:\n${this.config.supervisorRubric}` : '',
        ].filter(Boolean).join('\n\n'),
        tools,
        ...withBudget(this.roleBudget('supervisor')),
      });
      if (supervisorSpan) tracer!.end(supervisorSpan);
      total.cost += supervisorResponse.cost;
      pushTrace(trace, traceEnabled, review, 'supervisor', current.content, supervisorResponse);

      if (approved) return current;
      if (!feedback) {
        console.warn('[agentcraft:team] Supervisor did not call an approval/revision tool; treating as approved.');
        return current;
      }
      current = await this.config.orchestrator.run({
        prompt: `Revise the final output using this supervisor feedback:\n${feedback}\n\nDraft:\n${current.content}`,
        ...withBudget(this.roleBudget('orchestrator')),
      });
      total.cost += current.cost;
      pushTrace(trace, traceEnabled, review, 'orchestrator', feedback, current);
    }

    return current;
  }

  private buildOrchestratorPrompt(task: string, parallelContext = ''): string {
    const roster = this.config.members
      .map((member) => `- ${member.role}: ${member.description ?? 'No description provided'}`)
      .join('\n');
    const hint = this.config.executionHint
      ? `\nThe user prefers ${this.config.executionHint} execution where task structure allows.`
      : '';
    return [
      `Task:\n${task}`,
      this.config.mode === 'planner-executor-reviewer'
        ? 'Use a planner/executor/reviewer flow: plan the work, invoke specialists for execution, then review and reconcile before final answer.'
        : '',
      `Team roster:\n${roster}`,
      parallelContext ? `Parallel member results already collected:\n${parallelContext}` : '',
      `You have a maximum of ${this.config.maxRounds} rounds and may call any single agent at most ${this.config.maxRevisions} times for revisions.${hint}`,
      'Use explicit handoffs: name the next role, pass only relevant context, and avoid repeated calls without new information.',
      this.config.memory ? 'Use memory to store role-tagged intermediate outputs and retrieve prior work when useful.' : '',
    ]
      .filter(Boolean)
      .join('\n\n');
  }

  private async runParallelMembers(
    task: string,
    trace: TeamTrace[],
    traceEnabled: boolean,
    total: { cost: number },
    agentsUsed: Set<string>,
    tracer: RunTracer,
    parentSpanId: string
  ): Promise<string> {
    if (this.config.members.length === 0) return '';
    const responses = await Promise.all(this.config.members.map(async (member) => {
      const span = tracer.start('team', `team.parallel.${member.role}`, { role: member.role }, parentSpanId);
      try {
        const response = await member.agent.run({ prompt: task, ...withBudget(this.roleBudget(member.role)) });
        total.cost += response.cost;
        agentsUsed.add(member.role);
        pushTrace(trace, traceEnabled, 0, member.role, task, response);
        tracer.end(span);
        return `## ${member.role}\n${response.content}`;
      } catch (error) {
        tracer.end(span, error);
        if (this.config.onMemberError === 'fail') throw error;
        return `## ${member.role}\nSkipped: ${(error as Error).message}`;
      }
    }));
    return responses.join('\n\n');
  }

  private async initSharedAdapters(): Promise<void> {
    if (this.initialized) return;
    for (const adapter of this.sharedLifecycle) {
      if (adapter.init) await adapter.init();
    }
    this.initialized = true;
  }

  private collectSharedAdapters(): AgentAdapter[] {
    const adapters = [
      ...this.config.sharedAdapters,
      ...(this.config.memory ? [this.config.memory] : []),
      ...this.allAgents().flatMap((agent) => [...agent.getAttachedAdapters()]),
    ];
    return Array.from(new Set(adapters));
  }

  private roleBudget(role: string, runBudget?: AgentRunParams['budget']): AgentRunParams['budget'] {
    return mergeBudgets(this.config.workspace?.budget, runBudget, this.config.roleBudgets[role]);
  }

  private sortAdapters(adapters: AgentAdapter[]): AgentAdapter[] {
    const sorted: AgentAdapter[] = [];
    const visiting = new Set<AgentAdapter>();
    const visited = new Set<AgentAdapter>();
    const visit = (adapter: AgentAdapter) => {
      if (visited.has(adapter)) return;
      if (visiting.has(adapter)) throw new ConfigurationError('Circular adapter dependency detected in AgentTeam');
      visiting.add(adapter);
      for (const dep of adapter.dependsOn ?? []) {
        if (isAgentAdapter(dep) && adapters.includes(dep)) visit(dep);
      }
      visiting.delete(adapter);
      visited.add(adapter);
      sorted.push(adapter);
    };
    adapters.forEach(visit);
    return sorted;
  }

  private allAgents(): Agent[] {
    return [
      this.config.orchestrator,
      ...this.config.members.map((member) => member.agent),
      ...(this.config.supervisor ? [this.config.supervisor] : []),
    ];
  }

  private async runSpawnPhase(task: string): Promise<void> {
    if (!this.spawnConfig) return;

    let began = false;
    const maxAgents = this.spawnConfig.maxAgents ?? DEFAULT_MAX_AGENTS;
    const tools: ToolDefinition[] = [
      {
        name: 'spawn_agent',
        description: 'Declare a specialist role needed for this task.',
        parameters: {
          type: 'object',
          properties: {
            role: { type: 'string', description: 'Specialist role name' },
            system: { type: 'string', description: 'Role-specific system prompt' },
            description: { type: 'string', description: 'Role description' },
          },
          required: ['role', 'system', 'description'],
        },
        execute: async (args) => {
          if (this.config.members.length >= maxAgents) {
            return `maxAgents reached (${maxAgents}); no more agents may be spawned`;
          }
          const role = String(args.role ?? `agent_${this.config.members.length + 1}`);
          const system = String(args.system ?? `Act as ${role}`);
          const description = String(args.description ?? `Spawned ${role} specialist`);
          this.config.members.push({
          role,
          agent: this.prepareSpawnedAgent(this.spawnConfig!.root.cloneWithSystem(system, role), role),
          description,
        });
          return `spawned:${role}`;
        },
      },
      {
        name: 'begin_task',
        description: 'Signal that team design is complete and orchestration may begin.',
        parameters: {
          type: 'object',
          properties: { plan: { type: 'string', description: 'Execution plan summary' } },
          required: ['plan'],
        },
        execute: async () => {
          began = true;
          return 'begin';
        },
      },
    ];

    await this.spawnConfig.root.run({
      prompt: [
        `Task:\n${task}`,
        `Before starting, call spawn_agent for each specialist role you need (max ${maxAgents}). Then call begin_task.`,
        this.spawnConfig.roleHints?.length ? `Role hints: ${this.spawnConfig.roleHints.join(', ')}` : '',
      ]
        .filter(Boolean)
        .join('\n\n'),
      tools,
    });

    if (!began && this.config.members.length === 0) {
      for (const role of (this.spawnConfig.roleHints ?? ['researcher', 'writer']).slice(0, maxAgents)) {
        this.config.members.push({
          role,
          agent: this.prepareSpawnedAgent(this.spawnConfig.root.cloneWithSystem(`Act as the team's ${role}.`, role), role),
          description: `Spawned ${role} specialist`,
        });
      }
    }
  }

  private prepareSpawnedAgent(agent: Agent, role: string): Agent {
    agent.mergeToolPolicy(this.config.rolePolicies[role]);
    return agent;
  }
}

function isAgentAdapter(value: unknown): value is AgentAdapter {
  return Boolean(value && typeof value === 'object' && 'name' in value && 'requires' in value);
}

function normalizeCreateConfig(config: AgentTeamConfig): NormalizedTeamConfig {
  const workspaceAdapters = config.workspace ? [...config.workspace.adapters, ...config.workspace.mcps] : undefined;
  return {
    orchestrator: config.orchestrator,
    members: config.members,
    ...(config.supervisor !== undefined && { supervisor: config.supervisor }),
    ...(config.workspace !== undefined && { workspace: config.workspace }),
    rolePolicies: config.rolePolicies ?? {},
    sharedAdapters: workspaceAdapters ?? config.sharedAdapters ?? [],
    ...(config.memory !== undefined && { memory: config.memory }),
    ...(config.executionHint !== undefined && { executionHint: config.executionHint }),
    maxRounds: config.maxRounds ?? DEFAULT_MAX_ROUNDS,
    maxRevisions: config.maxRevisions ?? DEFAULT_MAX_REVISIONS,
    maxSupervisorReviews: config.maxSupervisorReviews ?? DEFAULT_MAX_SUPERVISOR_REVIEWS,
    onMemberError: config.onMemberError ?? 'retry',
    mode: config.mode ?? 'orchestrator',
    ...(config.supervisorRubric !== undefined && { supervisorRubric: config.supervisorRubric }),
    roleBudgets: config.roleBudgets ?? {},
  };
}

function applyWorkspaceToAgents(workspace: AgentWorkspaceInstance, agents: Agent[]): void {
  for (const agent of agents) {
    if (workspace.cache) agent.setCache(workspace.cache);
    agent.setEventEmitter(workspace.events);
    agent.mergeToolPolicy(workspace.toolPolicy);
    for (const adapter of workspace.adapters) agent.use(adapter);
    for (const mcp of workspace.mcps) agent.use(mcp);
  }
}

function mergeBudgets(
  workspaceBudget?: AgentRunParams['budget'],
  runBudget?: AgentRunParams['budget'],
  roleBudget?: AgentRunParams['budget'],
): AgentRunParams['budget'] {
  const merged = {
    ...(workspaceBudget ?? {}),
    ...(runBudget ?? {}),
    ...(roleBudget ?? {}),
  };
  return Object.keys(merged).length === 0 ? undefined : merged;
}

function sanitizeRole(role: string): string {
  return role.toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '') || 'member';
}

function pushTrace(
  trace: TeamTrace[],
  enabled: boolean,
  round: number,
  agentRole: string,
  input: string,
  response: Awaited<ReturnType<Agent['run']>>
): void {
  if (!enabled) return;
  trace.push({
    round,
    agentRole,
    input,
    output: response.content,
    cost: response.cost,
    tokensUsed: response.tokensUsed,
  });
}

function toTeamTraceSink(trace: AgentRunParams['trace']): TraceSink | undefined {
  if (!trace || trace === true) return undefined;
  return trace;
}

function withBudget(budget: AgentRunParams['budget']): Pick<AgentRunParams, 'budget'> | Record<string, never> {
  return budget === undefined ? {} : { budget };
}
