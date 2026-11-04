export interface SkillFrontmatter {
  name: string;
  description: string;
  version?: number;
}

export enum SkillLevel {
  Metadata = 1,
  Instructions = 2,
  Files = 3,
}

export interface SkillDefinition {
  name: string;
  description: string;
  instructions?: string;
  files?: Record<string, string>;
  version: number;
}

const VALID_NAME = /^[a-z0-9-]+$/;
const NO_XML = /<[^>]+>/;

export function validateSkillName(name: string): void {
  if (!VALID_NAME.test(name)) {
    throw new Error(
      `Skill name '${name}' is invalid. Must match /^[a-z0-9-]+$/.`,
    );
  }
  if (name.length > 64) {
    throw new Error(
      `Skill name '${name}' exceeds 64 characters.`,
    );
  }
}

export function validateSkillDescription(description: string): void {
  if (!description || description.trim() === '') {
    throw new Error('Skill description must not be empty.');
  }
  if (description.length > 1024) {
    throw new Error(
      `Skill description exceeds 1024 characters (got ${description.length}).`,
    );
  }
  if (NO_XML.test(description)) {
    throw new Error('Skill description must not contain XML/HTML tags.');
  }
}

export function parseFrontmatter(raw: string): { frontmatter: SkillFrontmatter; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    throw new Error(
      'SKILL.md must start with a YAML frontmatter block delimited by ---',
    );
  }
  const yamlBlock = match[1] ?? '';
  const body = match[2] ?? '';
  const fm: Record<string, unknown> = {};
  for (const line of yamlBlock.split('\n')) {
    const sep = line.indexOf(':');
    if (sep === -1) continue;
    const key = line.slice(0, sep).trim();
    const value = line.slice(sep + 1).trim().replace(/^["']|["']$/g, '');
    if (key) fm[key] = value;
  }
  if (typeof fm['name'] !== 'string' || !fm['name']) {
    throw new Error("SKILL.md frontmatter must include a 'name' field.");
  }
  if (typeof fm['description'] !== 'string' || !fm['description']) {
    throw new Error("SKILL.md frontmatter must include a 'description' field.");
  }
  const version = fm['version'] !== undefined ? Number(fm['version']) : 1;
  const frontmatter: SkillFrontmatter = {
    name: fm['name'] as string,
    description: fm['description'] as string,
    version: isNaN(version) ? 1 : version,
  };
  validateSkillName(frontmatter.name);
  validateSkillDescription(frontmatter.description);
  return { frontmatter, body: body.trim() };
}
