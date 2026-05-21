import type { AgentAdapter } from "../adapters/types.js";
import type {
  AgentRunParams,
  SkillPromptAssemblyMode,
  SkillPromptAssemblyRecord,
} from "../types.js";
import { preprocessDirectives } from "../utils/directives.js";
import {
  selectActiveSkillMatches,
  type SkillActivationMode,
} from "./activation-engine.js";
import {
  assembleSkillPromptForRun,
  compileSkillRuntimeContext,
  inspectSkillPromptAssembly,
  type SkillPromptAssemblyContext,
} from "./prompt-assembler.js";

export function applySkillSystemPromptsForRun(input: {
  readonly params: AgentRunParams;
  readonly adapters: readonly AgentAdapter[];
  readonly assemblyRecords: SkillPromptAssemblyRecord[];
  readonly activationMode: SkillActivationMode;
  readonly assemblyMode: SkillPromptAssemblyMode;
}): AgentRunParams {
  const seen = new Set<string>();
  const matches = selectActiveSkillMatches({
    params: input.params,
    adapters: input.adapters,
    mode: input.activationMode,
  });
  const directiveOnlyBoundarySkills = new Set(
    matches
      .filter((match) => match.reason === "directive")
      .map((match) => match.skill.name),
  );
  const extensions = matches.flatMap((match) => {
    const skill = match.skill;
    if (seen.has(skill.name)) return [];
    seen.add(skill.name);
    if (
      directiveOnlyBoundarySkills.has(skill.name) &&
      input.activationMode === "directive-only"
    ) {
      return [];
    }
    return skillPromptExtensions({
      skill,
      params: input.params,
      adapters: input.adapters,
      activeSkillCount: matches.length,
      activationMode: input.activationMode,
      assemblyMode: input.assemblyMode,
      directiveBoundary: false,
      assemblyRecords: input.assemblyRecords,
    });
  });

  if (extensions.length === 0) return input.params;
  return {
    ...input.params,
    system: [input.params.system, ...extensions].filter(Boolean).join("\n\n"),
  };
}

export function preprocessSkillDirectivesForRun(input: {
  readonly params: AgentRunParams;
  readonly adapters: readonly AgentAdapter[];
  readonly assemblyRecords: SkillPromptAssemblyRecord[];
  readonly activationMode: SkillActivationMode;
  readonly assemblyMode: SkillPromptAssemblyMode;
}): AgentRunParams {
  const result = preprocessDirectives(input.params.prompt!, [...input.adapters], {
    promptForSkill: (skill) =>
      skillPromptExtensions({
        skill,
        params: input.params,
        adapters: input.adapters,
        activeSkillCount:
          selectActiveSkillMatches({
            params: input.params,
            adapters: input.adapters,
            mode: input.activationMode,
          }).length || 1,
        activationMode: input.activationMode,
        assemblyMode: input.assemblyMode,
        directiveBoundary: true,
        assemblyRecords: input.assemblyRecords,
      }).join("\n\n"),
  });
  return {
    ...input.params,
    prompt: result.processedPrompt,
    system: [input.params.system, result.additionalSystemContent.trim()]
      .filter(Boolean)
      .join("\n\n"),
  };
}

function skillPromptExtensions(input: {
  readonly skill: Parameters<typeof assembleSkillPromptForRun>[0];
  readonly params: AgentRunParams;
  readonly adapters: readonly AgentAdapter[];
  readonly activeSkillCount: number;
  readonly activationMode: SkillActivationMode;
  readonly assemblyMode: SkillPromptAssemblyMode;
  readonly directiveBoundary: boolean;
  readonly assemblyRecords: SkillPromptAssemblyRecord[];
}): string[] {
  const assemblyContext = {
    prompt: input.params.prompt ?? "",
    adapters: input.adapters,
    activeSkillCount: input.activeSkillCount,
    activationMode: input.activationMode,
    assemblyMode: input.assemblyMode,
  } satisfies SkillPromptAssemblyContext;
  const promptExtension = assembleSkillPromptForRun(
    input.skill,
    assemblyContext,
  );
  const runtimeContext = compileSkillRuntimeContext(
    input.skill,
    input.params.prompt ?? "",
    input.adapters,
  );
  if (promptExtension) {
    input.assemblyRecords.push(
      inspectSkillPromptAssembly(input.skill, assemblyContext, {
        promptExtension,
        runtimeContext,
        directiveBoundary: input.directiveBoundary,
      }),
    );
  }
  return [promptExtension, runtimeContext].filter(
    (item): item is string => item !== undefined && item.trim().length > 0,
  );
}
