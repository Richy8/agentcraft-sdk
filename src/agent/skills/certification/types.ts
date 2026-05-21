export interface PromptResearchTemplate {
  readonly skillFamily: string;
  readonly requiredSources: readonly string[];
  readonly notes: readonly string[];
  readonly outputArtifact: string;
}

export interface SkillQualityRubric {
  readonly name: string;
  readonly description: string;
  readonly requiredSignals: readonly string[];
  readonly maxScore: number;
}

export interface SkillQualityScore {
  readonly skill: string;
  readonly score: number;
  readonly maxScore: number;
  readonly baselineThreshold: number;
  readonly productionThreshold: number;
  readonly passed: boolean;
  readonly productionPassed: boolean;
  readonly tier: 'review' | 'baseline' | 'production';
  readonly missingSignals: readonly string[];
}
