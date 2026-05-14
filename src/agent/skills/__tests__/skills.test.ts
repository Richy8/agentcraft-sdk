import { describe, expect, it, vi } from "vitest";
import { Agent } from "../../agent.js";
import { Provider } from "../../provider-catalog.js";
import { MemoryMCP } from "../../mcp-servers/index.js";
import { TavilySearchAdapter } from "../../adapters/index.js";
import { AdapterRequirementError } from "../../../errors/index.js";
import { preprocessDirectives } from "../../utils/directives.js";
import {
  CodeReviewSkill,
  ConversationSkill,
  DataAnalysisSkill,
  DeepResearchSkill,
  DocumentAnalysisSkill,
  EmailDraftSkill,
  HumanizerSkill,
  MeetingSkill,
  MemorySkill,
  ResearchSkill,
  SchedulerSkill,
  SummarizeSkill,
  TranscriptionSkill,
  TranslationSkill,
  VisionSkill,
  WritingSkill,
} from "../index.js";

describe("skills", () => {
  it("preprocesses attached directives into bounded sections and system additions", () => {
    const skill = HumanizerSkill.create();
    const result = preprocessDirectives("/humanizer Write this naturally.", [
      skill,
    ]);

    expect(result.processedPrompt).toContain("[APPLY_HUMANIZER_START]");
    expect(result.processedPrompt).toContain("[APPLY_HUMANIZER_END]");
    expect(result.additionalSystemContent).toContain("BANNED AI PHRASES");
  });

  it("fails fast for unknown skill directives instead of silently ignoring them", () => {
    expect(() =>
      preprocessDirectives("/not-attached Do specialized work.", [
        HumanizerSkill.create(),
      ]),
    ).toThrow("no attached skill handles it");
  });

  it("validates OR dependencies for research and memory skills", () => {
    const agent = Agent.create({ model: Provider.ollama["llama3.2"] });
    expect(() => agent.use(ResearchSkill.create())).toThrow(
      AdapterRequirementError,
    );

    agent.use(TavilySearchAdapter.connect({ apiKey: "key" }));
    expect(() => agent.use(ResearchSkill.create())).not.toThrow();

    const memoryAgent = Agent.create({ model: Provider.ollama["llama3.2"] });
    memoryAgent.use(MemoryMCP.connect());
    expect(() => memoryAgent.use(MemorySkill.create())).not.toThrow();
  });

  it("builds structured production prompts and metadata for every built-in skill", () => {
    const skills = [
      ResearchSkill.create(),
      DeepResearchSkill.create(),
      WritingSkill.create(),
      SummarizeSkill.create(),
      TranslationSkill.create(),
      HumanizerSkill.create(),
      CodeReviewSkill.create(),
      DataAnalysisSkill.create(),
      DocumentAnalysisSkill.create(),
      MemorySkill.create(),
      ConversationSkill.create(),
      EmailDraftSkill.create(),
      SchedulerSkill.create(),
      MeetingSkill.create(),
      VisionSkill.create(),
      TranscriptionSkill.create(),
    ];

    for (const skill of skills) {
      const prompt =
        typeof skill.systemPromptExtension === "function"
          ? skill.systemPromptExtension()
          : skill.systemPromptExtension;
      expect(prompt).toContain("## Goal");
      expect(prompt).toContain("## Tool Use Policy");
      expect(prompt).toContain("## Output Format");
      expect(prompt).toContain("## Quality Checklist");
      expect(prompt).toContain("## Failure Behavior");
      expect(prompt).toContain("## Safety Notes");
      expect(skill.skillMetadata?.promptVersion).toBe("2026-05-12");
      expect(skill.skillMetadata?.requiredCapabilities).toEqual(skill.requires);
      expect(skill.skillMetadata?.sideEffectRisk).toBeTruthy();
    }
  });

  it("keeps writing-related built-in skills grounded in quality rather than detector evasion", () => {
    for (const skill of [WritingSkill.create(), HumanizerSkill.create()]) {
      const prompt =
        typeof skill.systemPromptExtension === "function"
          ? skill.systemPromptExtension()
          : skill.systemPromptExtension;

      expect(prompt).toContain(
        "Do not optimize writing for deceiving AI detectors",
      );
      expect(prompt).toContain("specific");
      expect(prompt).not.toContain("bypass AI");
    }
  });

  it("keeps high-variance built-in skills anchored to domain-specific failure modes", () => {
    const expectations = [
      [
        WritingSkill.create(),
        ["skeptical reader", "Failure modes to avoid", "conclusion"],
      ],
      [
        HumanizerSkill.create(),
        [
          "voice-preserving line editor",
          "Do not add contractions",
          "friendly internet essay",
        ],
      ],
      [
        CodeReviewSkill.create(),
        ["failure path", "Severity scale", "blast radius"],
      ],
      [
        DataAnalysisSkill.create(),
        ["missingness", "alternative explanation", "Correlation and causation"],
      ],
      [DeepResearchSkill.create(), ["Round 1", "Round 2", "Round 3"]],
      [SummarizeSkill.create(), ["complete claims", "topic-label bullet list"]],
    ] as const;

    for (const [skill, signals] of expectations) {
      const prompt =
        typeof skill.systemPromptExtension === "function"
          ? skill.systemPromptExtension()
          : skill.systemPromptExtension;

      for (const signal of signals) {
        expect(prompt).toContain(signal);
      }
    }
  });

  it("declares dependency metadata for adapter-backed and stateful skills", () => {
    expect(ResearchSkill.create().skillMetadata).toMatchObject({
      requiredAdapters: ["tavily", "firecrawl"],
      optionalAdapters: ["fetch"],
      stateful: false,
      sideEffectRisk: "external",
    });
    expect(DeepResearchSkill.create().skillMetadata).toMatchObject({
      requiredAdapters: ["tavily", "filesystem"],
      sideEffectRisk: "write",
    });
    expect(DataAnalysisSkill.create().skillMetadata).toMatchObject({
      requiredAdapters: [],
      optionalAdapters: ["filesystem", "database", "supabase"],
      sideEffectRisk: "read",
    });
    expect(MemorySkill.create().skillMetadata).toMatchObject({
      requiredAdapters: [],
      optionalAdapters: ["pinecone", "redis", "supabase-mcp", "memory-mcp"],
      stateful: true,
      sideEffectRisk: "write",
    });
    expect(ConversationSkill.create().skillMetadata).toMatchObject({
      stateful: true,
      optionalAdapters: ["redis", "memory-mcp"],
    });
    expect(VisionSkill.create().skillMetadata?.requiredCapabilities).toEqual([
      "vision",
    ]);
    expect(
      TranscriptionSkill.create().skillMetadata?.requiredCapabilities,
    ).toEqual(["audio"]);
  });

  it("rejects capability-specific skills on unsupported models", () => {
    const agent = Agent.create({ model: Provider.ollama["llama3.2"] });
    expect(() => agent.use(VisionSkill.create())).toThrow(
      AdapterRequirementError,
    );
  });

  it("conversation skill falls back to in-process memory and warns once", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const skill = ConversationSkill.create();

    await skill.onBeforeRun?.({ prompt: "hello" });
    await skill.onAfterRun?.({
      content: "hi there",
      cost: 0,
      tokensUsed: { prompt: 1, completion: 1, total: 2 },
      finishReason: "stop",
      model: "m",
      provider: "p",
    });
    const second = await skill.onBeforeRun?.({ prompt: "again" });
    await skill.onBeforeRun?.({ prompt: "again" });

    expect(warn).toHaveBeenCalledTimes(1);
    expect(second?.system).toContain("Prior conversation history");
    expect(second?.system).toContain("ASSISTANT: hi there");
    warn.mockRestore();
  });
});
