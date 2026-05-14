import { buildSkillPrompt } from "./types.js";
import { createBuiltInSkill, SKILL_SPECS } from "./catalog.js";

const HUMANIZER_STYLE_RULES = `BANNED AI PHRASES:
- "delve", "delve into", "delve deeper"
- "it's worth noting that", "it is important to note"
- "certainly", "absolutely", "of course" as empty affirmations
- "I'd be happy to", "I'd be glad to", "as an AI"
- "In conclusion,", "In summary," at the start of a paragraph
- "robust", "leverage" as a verb, "seamlessly", "comprehensive", "cutting-edge", "state-of-the-art"

STYLE RULES:
- Infer the source voice first; edit inside that voice instead of making everything casual.
- Vary sentence length only where the source rhythm feels mechanical or needlessly uniform.
- Use contractions only when the original voice already supports them.
- Prefer active voice when it clarifies the sentence; keep passive voice when it protects accuracy or emphasis.
- Ground claims in concrete details already present in the text; do not invent anecdotes, emotion, or lived experience.
- Avoid bullet lists unless the content is genuinely enumerable.`;

export class HumanizerSkill {
  static readonly skillName = "humanizer";
  static readonly systemPromptExtension = `${buildSkillPrompt(SKILL_SPECS.humanizer.name, SKILL_SPECS.humanizer.prompt)}\n\n## Humanizer Style Rules\n${HUMANIZER_STYLE_RULES}`;

  static create() {
    return createBuiltInSkill(SKILL_SPECS.humanizer, {
      overrides: {
        prompt: {
          ...SKILL_SPECS.humanizer.prompt,
          safetyNotes: [
            ...SKILL_SPECS.humanizer.prompt.safetyNotes,
            HUMANIZER_STYLE_RULES,
          ],
        },
      },
    });
  }
}
