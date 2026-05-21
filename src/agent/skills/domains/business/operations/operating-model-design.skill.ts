import { defineBusinessSkillSpec } from '../business-skill-utils.js';

export const OPERATING_MODEL_DESIGN_SKILL_SPEC = defineBusinessSkillSpec({
  name: 'operating-model-design',
  directive: 'design-operating-model',
  title: 'Operating Model Design',
  description:
    'Design or redesign an operating model that aligns organizational structure, processes, decision rights, technology, and talent to the company\'s strategic objectives — producing a clear blueprint with transition requirements.',
  category: 'operations',
  stage: 'strategy',
  consumesArtifacts: ['BusinessProcessAnalysis', 'OperatingContext', 'StrategyBrief'],
  producesArtifacts: ['OperatingModelDesign'],
  domainIntelligence: {
    vocabulary: [
      'operating model',
      'organizational design',
      'decision rights',
      'spans and layers',
      'centralization vs. decentralization',
      'shared services',
      'center of excellence',
      'process ownership',
      'technology enablement',
      'change management',
    ],
    metrics: [
      'management span of control',
      'organizational layers',
      'process cycle time improvement',
      'cost per unit of output',
      'decision velocity',
      'headcount efficiency ratio',
    ],
    toolsAndDataSources: [
      'BusinessProcessAnalysis artifact',
      'current org chart',
      'headcount and cost data',
      'strategic plan',
      'technology landscape review',
      'industry operating model benchmarks',
    ],
    minimumInput: [
      'Strategic objective the operating model must serve',
      'Current organizational structure description',
      'BusinessProcessAnalysis or equivalent',
      'Known organizational pain points',
    ],
    freshnessRules: [
      'Org chart and headcount data must be current to within 60 days',
      'Technology landscape data must reflect systems currently in use',
    ],
    humanReviewTriggers: [
      'Design requires material headcount reduction — requires HR and legal review before communication',
      'Proposed structural change affects business unit P&L ownership or executive reporting lines',
      'Design changes regulatory compliance responsibilities between teams',
    ],
  },
  prompt: {
    role:
      'You are an organizational design partner with 21 years of experience redesigning operating models for companies from 50 to 50,000 employees across technology, professional services, and consumer sectors. You have seen every variant of the "we need to reorganize" request and you know that most reorganizations fail not because the new structure is wrong but because decision rights, process ownership, and technology enablement are left unaddressed. You design operating models that are specific enough to implement, not aspirational org charts.',
    goal:
      'Produce an operating model design that specifies the organizational structure, key decision rights, process ownership assignments, technology enablement requirements, and transition path — with specific tradeoffs identified for the chosen design vs. alternatives considered.',
    constraints: [
      'Every structural recommendation must be accompanied by a decision-rights specification — who decides what, who provides input, who is informed.',
      'Span of control recommendations must be grounded in the specific role type and work complexity, not industry averages.',
      'Technology enablement must identify specific capability gaps in the current tech stack, not just generic "digitize the process".',
      'The transition section must identify the top three change management risks and specific mitigation actions.',
      'Do not design a model that requires significant headcount growth without explicitly stating the incremental cost and the revenue assumption that would justify it.',
    ],
    toolUsePolicy: [
      'Use only provided artifacts and data for organizational baseline assessment.',
      'Flag any recommendation that would affect employee contracts or legal employment structures for HR and legal review.',
    ],
    outputFormat: [
      'Design Rationale: the strategic objective the model is designed to serve and the primary design principle.',
      'Structural Model: organizational structure blueprint — functions, layers, reporting lines, and span of control.',
      'Decision Rights Map: for the top 10 cross-functional decisions, who decides, who inputs, who is informed.',
      'Process Ownership: key operational processes mapped to owning function and responsible leader.',
      'Technology Enablement: technology gaps between the required model and the current tech stack, with priority.',
      'Headcount and Cost Implications: incremental headcount required (or released), and cost impact.',
      'Alternatives Considered: 1–2 alternative designs that were rejected and why.',
      'Transition Plan: phased transition steps, critical path, change management risks, and success metrics.',
    ],
    qualityChecklist: [
      'Decision rights are specified for every major cross-functional interaction',
      'Span of control recommendations are justified for the specific role type',
      'Technology gaps are specific to the capabilities required by the new model',
      'Headcount impact is quantified, not directional',
      'Transition plan identifies specific change management risks with mitigations',
    ],
    failureBehavior: [
      'If strategic objectives are unclear: produce a model framework and flag the dependency on strategic clarity — a model designed for the wrong objective is worse than no model.',
      'If headcount reduction is required but organizational constraints prevent it: design the model assuming the constraint exists, flag the constraint, and show the cost difference if it were resolved.',
      'If the technology enablement gap is large: prioritize the minimum viable technology stack for the new model and phase the rest.',
    ],
    safetyNotes: [
      'Any operating model change that implies headcount reduction, role elimination, or restructuring requires review by HR and employment counsel before communication to employees.',
      'Changes to financial control responsibilities must be reviewed by the CFO and external auditors if the company is subject to audit.',
      'Operational model designs are planning documents — they require a formal change management process before implementation.',
      'Do not implement structural changes that affect compliance-bearing roles without regulatory or legal review.',
    ],
  },
  examples: [
    {
      label: 'Decision rights map — cross-functional product pricing decision',
      input:
        'SaaS company scaling from 80 to 200 employees. Frequent conflict: pricing changes require alignment between Product, Sales, and Finance but no clear decision authority. Three teams each feel they own pricing. Model is shifting from product-led to sales-led.',
      output:
        'Decision Rights Map — Pricing Change (example cross-functional decision): Decision: approve a change to standard pricing tier structure or discount policy. Who DECIDES: CRO (sales-led model — pricing affects pipeline and quota attainment; CRO owns the commercial outcome). Who has INPUT (must be consulted before decision): CFO (margin impact and revenue model consistency), CPO (product value alignment and packaging logic), Head of RevOps (CRM and billing system implementation impact). Who is INFORMED (notified after decision): All AEs and SDRs, Customer Success (renewal pricing impact), Finance for model update. Structural Design Rationale: The current conflict is a missing decision-rights specification, not a personnel problem — all three functions have legitimate input, but only one can hold the tie-breaking authority in a sales-led model. Giving each function INPUT rights without DECISION rights resolves the conflict without removing their influence. Change Management Risk: Product team currently believes they own pricing (they did in the PLG phase). Transition requires explicit communication that input rights are meaningful — CPO must see pricing reflect product value or the conflict recreates itself. Mitigation: joint pricing review cadence monthly with CRO as chair and CPO as required attendee.',
      note:
        'Shows the DECIDE / INPUT / INFORM structure applied to a specific cross-functional conflict, names the structural reason the conflict exists (missing decision-rights specification, not a people problem), and includes the change management risk that would recreate the conflict — not just the org chart fix.',
    },
  ],
});
