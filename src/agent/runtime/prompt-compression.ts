import type { PromptCompressionMode } from '../types.js';

const SHARED_SKILL_SECTION_NAMES = ['Failure Behavior', 'Safety Notes'] as const;

export function compressSkillPromptSystem(
  system: string,
  mode: PromptCompressionMode
): string {
  const blocks = system.split(/\n{2,}(?=# Skill: )/g);
  const sharedLines: string[] = [];
  const prepared = blocks.map((block) =>
    block.startsWith('# Skill: ') ? removeSharedSkillSections(block, sharedLines) : block
  );
  const sharedQualityLines = collectRepeatedSkillBullets(prepared);
  const compressed = prepared.map((block) => {
    const withoutRepeated = removeRepeatedSkillBullets(block, sharedQualityLines);
    if (!withoutRepeated.startsWith('# Skill: ')) return compactLines(withoutRepeated, mode);
    return compactSkillBlock(withoutRepeated, mode);
  });
  if (sharedLines.length > 0) {
    compressed.push(
      [
        '# Shared Skill Safety',
        '## Failure Behavior',
        ...unique(
          sharedLines
            .filter((line) => /^failure:/i.test(line))
            .map((line) => line.replace(/^failure:\s*/i, '- '))
        ),
        '## Safety Notes',
        ...unique(
          sharedLines
            .filter((line) => /^safety:/i.test(line))
            .map((line) => line.replace(/^safety:\s*/i, '- '))
        ),
      ]
        .filter((line) => line.trim().length > 0)
        .join('\n')
    );
  }
  if (sharedQualityLines.length > 0) {
    compressed.push(
      ['# Shared Skill Quality', ...sharedQualityLines.map((line) => line.replace(/^\s*-\s*/, '- '))].join(
        '\n'
      )
    );
  }
  return compressed.filter(Boolean).join(mode === 'aggressive' ? '\n' : '\n\n');
}

function removeSharedSkillSections(block: string, sharedLines: string[]): string {
  let output = block;
  for (const sectionName of SHARED_SKILL_SECTION_NAMES) {
    const pattern = new RegExp(`\\n## ${sectionName}\\n([\\s\\S]*?)(?=\\n## |$)`, 'm');
    const match = output.match(pattern);
    if (!match) continue;
    const prefix = sectionName === 'Failure Behavior' ? 'failure' : 'safety';
    for (const line of match[1]!.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.startsWith('- ')) sharedLines.push(`${prefix}: ${trimmed.slice(2)}`);
    }
    output = output.replace(pattern, '');
  }
  return output;
}

function compactSkillBlock(block: string, mode: PromptCompressionMode): string {
  const lines = limitPromptSectionBullets(
    minifyLines(block).split('\n'),
    '## Quality Checklist',
    mode === 'safe' ? Number.POSITIVE_INFINITY : 2
  );
  return lines.map((line) => compactPromptLine(line, mode)).join('\n');
}

function limitPromptSectionBullets(
  lines: readonly string[],
  sectionName: string,
  maxBullets: number
): string[] {
  if (!Number.isFinite(maxBullets)) return [...lines];
  let inSection = false;
  let count = 0;
  return lines.filter((line) => {
    if (line.startsWith('## ')) {
      inSection = line === sectionName;
      count = 0;
      return true;
    }
    if (!inSection || !line.startsWith('- ')) return true;
    count += 1;
    return count <= maxBullets;
  });
}

function compactPromptLine(line: string, mode: PromptCompressionMode): string {
  const compacted = line
    .replace(/^# Skill: /, 'Skill: ')
    .replace(/^## Role$/, 'Role:')
    .replace(/^## Goal$/, 'Goal:')
    .replace(/^## Constraints$/, 'Constraints:')
    .replace(/^## Tool Use Policy$/, 'Tools:')
    .replace(/^## Output Format$/, 'Output:')
    .replace(/^## Quality Checklist$/, 'Quality:')
    .replace(/^- /, '- ');
  if (mode !== 'aggressive') return compacted;
  return compacted.replace(/^Constraints:$/, 'Rules:').replace(/^Quality:$/, 'QA:');
}

function collectRepeatedSkillBullets(blocks: readonly string[]): string[] {
  const counts = new Map<string, number>();
  for (const block of blocks) {
    if (!block.startsWith('# Skill: ')) continue;
    for (const line of block.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('- ')) continue;
      counts.set(trimmed, (counts.get(trimmed) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([line]) => line);
}

function removeRepeatedSkillBullets(block: string, repeatedLines: readonly string[]): string {
  if (repeatedLines.length === 0 || !block.startsWith('# Skill: ')) return block;
  const repeated = new Set(repeatedLines);
  return block
    .split('\n')
    .filter((line) => !repeated.has(line.trim()))
    .join('\n');
}

function compactLines(value: string, mode: PromptCompressionMode): string {
  const minified = minifyLines(value);
  return mode === 'aggressive' ? minified.replace(/\n{2,}/g, '\n') : minified;
}

function minifyLines(value: string): string {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n')
    .replace(/[ \t]{2,}/g, ' ');
}

function unique(values: readonly string[]): string[] {
  return Array.from(new Set(values));
}
