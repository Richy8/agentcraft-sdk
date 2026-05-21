export interface SkillPromptTemplate {
  role: string;
  goal: string;
  constraints: string[];
  toolUsePolicy: string[];
  outputFormat: string[];
  qualityChecklist: string[];
  failureBehavior: string[];
  safetyNotes: string[];
}

export interface SkillPromptExample {
  readonly label: string;
  readonly input: string;
  readonly output: string;
  readonly note?: string;
}

export function buildSkillPrompt(
  name: string,
  prompt: SkillPromptTemplate,
  examples?: readonly SkillPromptExample[],
): string {
  validateSkillPromptTemplate(name, prompt);

  const parts = [
    `# Skill: ${name}`,
    '',
    '## Role',
    prompt.role,
    '',
    '## Goal',
    prompt.goal,
    '',
    '## Constraints',
    formatList(prompt.constraints),
    '',
    '## Tool Use Policy',
    formatList(prompt.toolUsePolicy),
    '',
    '## Output Format',
    formatList(prompt.outputFormat),
    '',
    '## Quality Checklist',
    formatList(prompt.qualityChecklist),
    '',
    '## Failure Behavior',
    formatList(prompt.failureBehavior),
    '',
    '## Safety Notes',
    formatList(prompt.safetyNotes),
  ];

  if (examples && examples.length > 0) {
    parts.push('', '## Examples');
    for (const ex of examples) {
      parts.push('', `### ${ex.label}`);
      parts.push('**Input:**', ex.input, '', '**Output:**', ex.output);
      if (ex.note) parts.push('', `_Note: ${ex.note}_`);
    }
  }

  return parts.join('\n');
}

export function validateSkillPromptTemplate(name: string, prompt: SkillPromptTemplate): void {
  const sections: Array<[keyof SkillPromptTemplate, string]> = [
    ['role', 'Role'],
    ['goal', 'Goal'],
    ['constraints', 'Constraints'],
    ['toolUsePolicy', 'Tool Use Policy'],
    ['outputFormat', 'Output Format'],
    ['qualityChecklist', 'Quality Checklist'],
    ['failureBehavior', 'Failure Behavior'],
    ['safetyNotes', 'Safety Notes'],
  ];

  for (const [key, label] of sections) {
    const value = prompt[key];
    if (typeof value === 'string') {
      if (value.trim().length === 0) {
        throw new Error(`Skill '${name}' is missing required prompt section '${label}'`);
      }
      continue;
    }
    if (value.length === 0 || value.some((item) => item.trim().length === 0)) {
      throw new Error(`Skill '${name}' is missing required prompt section '${label}'`);
    }
  }
}

function formatList(items: string[]): string {
  return items.map((item) => `- ${item}`).join('\n');
}
