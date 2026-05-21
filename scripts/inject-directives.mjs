#!/usr/bin/env node
/**
 * Injects action-based directive fields into domain skill files that don't have one.
 * Derives the directive from the skill name using action-verb suffix mapping.
 */

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

const root = process.cwd();

// Map skill name suffixes/patterns to action directives
function deriveDirective(skillName) {
  // Check exact patterns first
  const patterns = [
    [/-writer$/, 'draft'],
    [/-writing$/, 'draft'],
    [/-generator$/, 'generate'],
    [/-review$/, 'review'],
    [/-reviewer$/, 'review'],
    [/-audit$/, 'audit'],
    [/-checker$/, 'check'],
    [/-check$/, 'check'],
    [/-analysis$/, 'analyze'],
    [/-analyzer$/, 'analyze'],
    [/-research$/, 'research'],
    [/-researcher$/, 'research'],
    [/-planner$/, 'plan'],
    [/-plan$/, 'plan'],
    [/-planning$/, 'plan'],
    [/-summary$/, 'summarize'],
    [/-summarize$/, 'summarize'],
    [/-summarizer$/, 'summarize'],
    [/-synthesis$/, 'synthesize'],
    [/-synthesizer$/, 'synthesize'],
    [/-mapper$/, 'map'],
    [/-map$/, 'map'],
    [/-scanner$/, 'scan'],
    [/-scan$/, 'scan'],
    [/-mining$/, 'mine'],
    [/-miner$/, 'mine'],
    [/-brief$/, 'brief'],
    [/-briefer$/, 'brief'],
    [/-profile$/, 'profile'],
    [/-profiler$/, 'profile'],
    [/-framework$/, 'frame'],
    [/-guide$/, 'guide'],
    [/-guideline$/, 'guide'],
    [/-comparison$/, 'compare'],
    [/-compare$/, 'compare'],
    [/-comparator$/, 'compare'],
    [/-narrative$/, 'narrate'],
    [/-triage$/, 'triage'],
    [/-triager$/, 'triage'],
    [/-evaluation$/, 'evaluate'],
    [/-evaluator$/, 'evaluate'],
    [/-assessment$/, 'assess'],
    [/-report$/, 'report'],
    [/-reporting$/, 'report'],
    [/-reporter$/, 'report'],
    [/-insight$/, 'synthesize'],
    [/-insights$/, 'synthesize'],
    [/-ideation$/, 'ideate'],
    [/-ideas$/, 'ideate'],
    [/-idea$/, 'ideate'],
    [/-playbook$/, 'draft'],
    [/-script$/, 'draft'],
    [/-scriptwriter$/, 'draft'],
    [/-pitch$/, 'pitch'],
    [/-deck$/, 'draft'],
    [/-deck-writer$/, 'draft'],
    [/-risk$/, 'assess-risk'],
    [/-risk-review$/, 'assess-risk'],
    [/-strategy$/, 'strategize'],
    [/-strategist$/, 'strategize'],
    [/-forecast$/, 'forecast'],
    [/-segmentation$/, 'segment'],
    [/-positioning$/, 'position'],
    [/-differentiation$/, 'differentiate'],
    [/-scoring$/, 'score'],
    [/-scorecard$/, 'score'],
    [/-recommendation$/, 'recommend'],
    [/-optimization$/, 'optimize'],
    [/-optimizer$/, 'optimize'],
    [/-calendar$/, 'schedule'],
    [/-scheduler$/, 'schedule'],
    [/-tracking$/, 'track'],
    [/-tracker$/, 'track'],
    [/-monitoring$/, 'monitor'],
    [/-monitor$/, 'monitor'],
    [/-investigation$/, 'investigate'],
    [/-investigator$/, 'investigate'],
    [/-diagnosis$/, 'diagnose'],
    [/-diagnostic$/, 'diagnose'],
    [/-extraction$/, 'extract'],
    [/-extractor$/, 'extract'],
    [/-classification$/, 'classify'],
    [/-classifier$/, 'classify'],
    [/-prioritization$/, 'prioritize'],
    [/-prioritizer$/, 'prioritize'],
    [/-decomposition$/, 'decompose'],
    [/-breakdown$/, 'decompose'],
    [/-annotation$/, 'annotate'],
    [/-annotator$/, 'annotate'],
    [/-translation$/, 'translate'],
    [/-translator$/, 'translate'],
    [/-localization$/, 'localize'],
    [/-localizer$/, 'localize'],
    [/-competitor$/, 'analyze'],
    [/-competitive$/, 'analyze'],
    [/-onboarding$/, 'draft'],
    [/-runbook$/, 'draft'],
    [/-proposal$/, 'draft'],
    [/-template$/, 'draft'],
    [/-specification$/, 'specify'],
    [/-spec$/, 'specify'],
    [/-gap$/, 'audit'],
    [/-gap-analysis$/, 'audit'],
    [/-readout$/, 'report'],
    [/-brainstorm$/, 'ideate'],
    [/-hook$/, 'draft'],
    [/-objection$/, 'handle'],
    [/-tailor$/, 'tailor'],
    [/-tailoring$/, 'tailor'],
    [/-ats-review$/, 'review'],
    [/-role-research$/, 'research'],
    [/-discovery$/, 'discover'],
    [/-prospecting$/, 'prospect'],
    [/-outreach$/, 'draft'],
    [/-cold-email$/, 'draft'],
    [/-follow-up$/, 'draft'],
    [/-succession$/, 'plan'],
    [/-exit$/, 'plan'],
    [/-retention$/, 'analyze'],
    [/-persona$/, 'profile'],
    [/-stakeholder$/, 'map'],
    [/-negotiation$/, 'analyze'],
    [/-escalation$/, 'escalate'],
    [/-knowledge-base$/, 'document'],
    [/-faq$/, 'document'],
    [/-ticket$/, 'triage'],
    [/-sentiment$/, 'analyze'],
    [/-refund$/, 'review'],
    [/-incident$/, 'review'],
    [/-root-cause$/, 'investigate'],
    [/-log$/, 'analyze'],
    [/-deploy$/, 'review'],
    [/-infrastructure$/, 'review'],
    [/-ci$/, 'analyze'],
    [/-pipeline$/, 'analyze'],
    [/-test$/, 'test'],
    [/-testing$/, 'test'],
    [/-debug$/, 'debug'],
    [/-debugging$/, 'debug'],
    [/-migration$/, 'review'],
    [/-integration$/, 'review'],
    [/-regression$/, 'review'],
    [/-unit-test$/, 'generate'],
    [/-edge-case$/, 'analyze'],
    [/-boundary$/, 'analyze'],
    [/-coverage$/, 'analyze'],
    [/-dependency$/, 'analyze'],
    [/-scalability$/, 'review'],
    [/-performance$/, 'review'],
    [/-security$/, 'audit'],
    [/-api$/, 'review'],
    [/-contract$/, 'review'],
    [/-design-doc$/, 'draft'],
    [/-design$/, 'review'],
    [/-system$/, 'review'],
    [/-architecture$/, 'review'],
    [/-devops$/, 'review'],
    [/-prd$/, 'draft'],
    [/-roadmap$/, 'plan'],
    [/-launch$/, 'plan'],
    [/-ux$/, 'research'],
    [/-crm$/, 'analyze'],
    [/-deal$/, 'review'],
    [/-pipeline$/, 'analyze'],
    [/-account$/, 'research'],
    [/-buying$/, 'map'],
    [/-win-loss$/, 'analyze'],
    [/-battlecard$/, 'draft'],
    [/-demo$/, 'draft'],
    [/-case-study$/, 'draft'],
    [/-testimonial$/, 'draft'],
    [/-email$/, 'draft'],
    [/-seo$/, 'audit'],
    [/-campaign$/, 'plan'],
    [/-ad$/, 'draft'],
    [/-ads$/, 'draft'],
    [/-content$/, 'draft'],
    [/-copy$/, 'draft'],
    [/-headline$/, 'draft'],
    [/-tagline$/, 'draft'],
    [/-messaging$/, 'draft'],
    [/-linkedin$/, 'draft'],
    [/-youtube$/, 'draft'],
    [/-tiktok$/, 'draft'],
    [/-instagram$/, 'draft'],
    [/-pinterest$/, 'draft'],
    [/-twitter$/, 'draft'],
    [/-snapchat$/, 'draft'],
    [/-facebook$/, 'draft'],
    [/-substack$/, 'draft'],
    [/-newsletter$/, 'draft'],
    [/-blog$/, 'draft'],
    [/-article$/, 'draft'],
    [/-post$/, 'draft'],
    [/-thread$/, 'draft'],
    [/-caption$/, 'draft'],
    [/-thumbnail$/, 'brief'],
    [/-video$/, 'draft'],
    [/-podcast$/, 'draft'],
    [/-interview$/, 'draft'],
    [/-resume$/, 'draft'],
    [/-cover-letter$/, 'draft'],
    [/-portfolio$/, 'review'],
    [/-financial$/, 'analyze'],
    [/-stock$/, 'analyze'],
    [/-portfolio$/, 'review'],
    [/-market$/, 'research'],
    [/-investment$/, 'analyze'],
    [/-valuation$/, 'analyze'],
    [/-budget$/, 'plan'],
    [/-cash-flow$/, 'analyze'],
    [/-compliance$/, 'audit'],
    [/-policy$/, 'draft'],
    [/-clause$/, 'review'],
    [/-legal$/, 'review'],
    [/-due-diligence$/, 'review'],
    [/-nda$/, 'review'],
    [/-terms$/, 'draft'],
    [/-privacy$/, 'review'],
    [/-gdpr$/, 'review'],
    [/-hipaa$/, 'review'],
    [/-patient$/, 'draft'],
    [/-clinical$/, 'summarize'],
    [/-medical$/, 'review'],
    [/-evidence$/, 'review'],
    [/-literature$/, 'synthesize'],
    [/-guideline$/, 'compare'],
    [/-care-plan$/, 'summarize'],
    [/-referral$/, 'draft'],
    [/-intake$/, 'summarize'],
    [/-discharge$/, 'summarize'],
    [/-experiment$/, 'analyze'],
    [/-ab-test$/, 'analyze'],
    [/-dashboard$/, 'draft'],
    [/-metric$/, 'define'],
    [/-kpi$/, 'define'],
    [/-cohort$/, 'analyze'],
    [/-anomaly$/, 'investigate'],
    [/-forecast$/, 'forecast'],
    [/-attribution$/, 'analyze'],
    [/-funnel$/, 'analyze'],
    [/-churn$/, 'analyze'],
    [/-ltv$/, 'analyze'],
    [/-tasks$/, 'plan'],
    [/-task$/, 'plan'],
    [/-goal$/, 'plan'],
    [/-habit$/, 'plan'],
    [/-communication$/, 'draft'],
    [/-meeting$/, 'plan'],
    [/-life-admin$/, 'draft'],
    [/-productivity$/, 'plan'],
    [/-time$/, 'plan'],
    [/-weekly$/, 'plan'],
    [/-daily$/, 'plan'],
    [/-okr$/, 'draft'],
    [/-sprint$/, 'plan'],
    [/-backlog$/, 'refine'],
    [/-story$/, 'draft'],
    [/-user-story$/, 'draft'],
    [/-feature$/, 'draft'],
    [/-requirement$/, 'draft'],
    [/-persona$/, 'profile'],
    [/-journey$/, 'map'],
    [/-customer-journey$/, 'map'],
    [/-empathy-map$/, 'map'],
    [/-value-prop$/, 'draft'],
    [/-value-proposition$/, 'draft'],
    [/-brand-story$/, 'draft'],
    [/-proof-point$/, 'map'],
    [/-voice$/, 'profile'],
    [/-tone$/, 'profile'],
    [/-brand$/, 'research'],
    [/-audience$/, 'research'],
    [/-customer$/, 'research'],
    [/-persona$/, 'profile'],
    [/-promise$/, 'draft'],
  ];

  for (const [pattern, directive] of patterns) {
    if (pattern.test(skillName)) {
      return directive;
    }
  }

  // Default: use first meaningful verb from the name
  const parts = skillName.split('-');
  if (parts.length >= 2) {
    return parts[0]; // First word as a verb approximation
  }
  return 'execute';
}

// Find all skill files without a directive
const output = execSync(
  `find ${root}/src/agent/skills/domains -name "*.skill.ts" | xargs grep -L "directive:"`,
  { encoding: 'utf8' }
).trim().split('\n').filter(Boolean);

console.log(`Found ${output.length} skill files without directive field`);

let updated = 0;
let skipped = 0;

for (const filePath of output) {
  const content = readFileSync(filePath, 'utf8');

  // Find the name field to derive directive
  const nameMatch = content.match(/"name":\s*"([^"]+)"/);
  if (!nameMatch) {
    console.warn(`SKIP: no name field in ${filePath}`);
    skipped++;
    continue;
  }

  const skillName = nameMatch[1];
  const directive = deriveDirective(skillName);

  // Insert directive after the "name" field
  // Handle both JSON-style quoted keys and unquoted TypeScript keys
  const newContent = content.replace(
    /("name":\s*"[^"]+",?\s*\n)/,
    `$1  "directive": "${directive}",\n`
  );

  if (newContent === content) {
    console.warn(`SKIP: could not inject directive in ${filePath}`);
    skipped++;
    continue;
  }

  writeFileSync(filePath, newContent, 'utf8');
  updated++;
}

console.log(`\nDone: updated ${updated} files, skipped ${skipped}`);
