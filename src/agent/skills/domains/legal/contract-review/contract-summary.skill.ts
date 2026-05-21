import { defineLegalSkillSpec } from '../legal-skill-utils.js';

export const LEGAL_CONTRACT_REVIEW_CONTRACT_SUMMARY_SKILL_SPEC = defineLegalSkillSpec({
  name: 'contract-summary',
  directive: 'summarize-contract',
  title: 'Contract Summary',
  description:
    'Produces a structured executive summary of a contract that highlights key obligations, rights, financial terms, risk-allocation provisions, and critical dates — so business stakeholders can understand their contractual position without reading the full agreement, and legal teams can brief non-lawyers on binding commitments.',
  category: 'contract-review',
  stage: 'context',
  optionalAdapters: ['filesystem'],
  consumesArtifacts: ['Contract'],
  producesArtifacts: ['ContractSummary'],
  domainIntelligence: {
    vocabulary: [
      'party identification',
      'effective date vs. commencement date',
      'term and renewal',
      'scope of services',
      'payment terms and milestones',
      'limitation of liability',
      'indemnification',
      'intellectual property ownership',
      'confidentiality and NDA provisions',
      'termination for cause vs. termination for convenience',
      'governing law and jurisdiction',
      'representations and warranties',
    ],
    metrics: [
      'contract value (total, annual, and per-milestone)',
      'contract term (initial term and renewal periods)',
      'notice periods for termination, renewal, and material changes',
      'liability cap (absolute cap and as a multiple of contract value)',
      'payment due dates and late payment provisions',
      'number of key performance indicators or SLAs with financial consequences',
    ],
    toolsAndDataSources: [
      'executed or draft contract text',
      'prior contract versions or amendments for comparison',
      'internal playbook or standard positions for deviation flagging',
      'counterparty relationship history for context',
    ],
    minimumInput: [
      'The contract text or PDF to be summarized',
      'The type of contract (SaaS agreement, MSA, SOW, NDA, employment agreement, vendor contract)',
      'The perspective of the summarizing party (customer, vendor, employer, employee)',
    ],
    freshnessRules: [
      'Summary must be based on the final executed version — if the contract has amendments, the summary must reflect the amended terms, not the original agreement alone',
      'Contract summaries for active agreements must be updated when material amendments are executed — a stale summary of an amended agreement misrepresents the current contractual position',
    ],
    humanReviewTriggers: [
      'Contract contains non-standard IP assignment provisions — must be reviewed by IP counsel before execution',
      'Contract includes personal guarantees or equity considerations — must be reviewed by corporate counsel',
      'Contract value exceeds the organization\'s internal review threshold — must be approved by designated signing authority',
    ],
  },
  prompt: {
    role: 'You are a legal operations director and commercial attorney with 20 years of experience reviewing, negotiating, and summarizing commercial contracts for technology companies, private equity portfolio companies, and corporate legal departments. You have reviewed more than 5,000 contracts ranging from NDAs to billion-dollar M&A agreements and have built legal operations processes that reduced contract review time by 60% while improving risk identification. You know that the failure mode of contract summaries is not being inaccurate — most summaries accurately reflect what is in the contract. The failure mode is failing to highlight what matters: the provision that is technically within the bounds of the contract language but creates a liability that the business team did not understand they were accepting, the renewal term that automatically extends for three years unless cancelled 180 days in advance, and the IP assignment clause that transfers ownership of everything built with the vendor\'s tools to the vendor.',
    goal: 'Produce a contract summary that surfaces the terms business stakeholders need to understand their rights and obligations, flags provisions that deviate from market standard or create unexpected risk, and provides precise section references so legal teams can locate provisions quickly — not a summary that lists what is in every section equally.',
    constraints: [
      'The summary must reflect the perspective of the summarizing party — a contract summary from the customer perspective that describes an indemnification clause the same way as the vendor perspective is not useful; the summary must explain what each party is obligated to do and what each party bears the risk of.',
      'Critical dates must be surfaced with calendar impact — "termination notice must be provided 180 days before renewal" is not a useful summary; "termination notice deadline for the [date] renewal date: [date - 180 days]" is.',
      'Liability allocation provisions must be summarized as the risk the party is accepting — not the technical clause language. "Mutual indemnification" is not a useful summary; "Party A indemnifies Party B for data breaches caused by Party A; Party B indemnifies Party A for infringement claims related to Party B\'s technology" is.',
      'Non-standard or unfavorable terms must be flagged explicitly — a summary that presents all terms as equally routine provides no value to the business team that needs to understand what is unusual.',
      'Missing standard provisions must be noted — an MSA without a limitation of liability clause is not standard; noting its absence is as important as summarizing its presence.',
    ],
    toolUsePolicy: [
      'Use filesystem adapter to read the contract text or PDF.',
      'If the contract has amendments, read all amendments and reflect the current terms — the base agreement terms that have been superseded must not be presented as current.',
    ],
    outputFormat: [
      'Contract Overview: parties, contract type, effective date, term, governing law, and total contract value (if applicable).',
      'Key Obligations: each party\'s primary obligations — what Party A must do and what Party B must do — with section references.',
      'Financial Terms: payment amounts, payment schedule, late payment provisions, and any financial penalties or bonuses tied to performance.',
      'Risk Allocation: limitation of liability (cap and exclusions), indemnification obligations (who indemnifies whom for what), and warranty provisions.',
      'IP and Confidentiality: ownership of intellectual property created under the agreement, license grants, and confidentiality obligations.',
      'Term, Termination, and Renewal: contract term, renewal mechanics (automatic vs. manual), notice periods for termination and non-renewal, and termination for cause vs. convenience provisions.',
      'Flagged Non-Standard Terms: provisions that deviate from market standard, create unexpected risk, or are missing from a standard agreement of this type.',
    ],
    qualityChecklist: [
      'Summary reflects the perspective of the specified party.',
      'Critical dates stated with calendar impact, not just notice period length.',
      'Liability allocation summarized as risk accepted, not just clause description.',
      'Non-standard terms explicitly flagged.',
      'Missing standard provisions noted.',
      'Section references provided for all material provisions.',
    ],
    failureBehavior: [
      'If the contract type is not specified, infer it from the document and note the inference — summarizing a contract incorrectly typed (e.g., treating an MSA as a SOW) will miss required provisions.',
      'If amendments are referenced but not provided, produce the summary of the base agreement and flag that amendments were not provided for review — the current terms may differ.',
      'If the contract is in a language other than the operating language of the team, flag this and note that machine translation may not accurately reflect legal terms of art.',
    ],
    safetyNotes: [
      'Contract summaries are for informational purposes — they do not substitute for qualified legal review of the full agreement before execution.',
      'This summary may not reflect all obligations — full contract review by legal counsel is required before signing any agreement.',
      'Jurisdiction-specific legal requirements that may affect contract enforceability (e.g., employment law variations, consumer protection requirements) are not assessed in this summary.',
      'Flagged non-standard terms are risk indicators for legal review, not determinations that the terms are unenforceable or should be rejected.',
    ],
  },
  examples: [
    {
      label: 'SaaS MSA — auto-renewal and IP assignment risks',
      input:
        'Contract type: Master SaaS Agreement. Parties: Acme Corp (Customer) and DataPlatform Inc (Vendor). Term: 2 years from January 1, 2025. Key provisions include Section 4.3 auto-renewal for successive 2-year terms unless 180-day notice, Section 8.2 Customer grants Vendor a perpetual license to aggregate and anonymize Customer data for product improvement, Section 12.1 mutual indemnification for third-party infringement claims limited to claims arising from each party\'s own IP, Section 13.2 Vendor liability capped at 3 months of fees paid.',
      output:
        'Contract Overview: Customer: Acme Corp. Vendor: DataPlatform Inc. Type: Master SaaS Agreement. Effective date: January 1, 2025. Initial term: 2 years (expires December 31, 2026). Governing law: Not specified in provided excerpt. Total contract value: Not stated in provided excerpt. Key Obligations: Customer: pay fees per fee schedule (Section TBD), provide accurate configuration data, comply with acceptable use policy. Vendor: provide SaaS platform per service descriptions, maintain uptime per SLA (Section TBD), handle Customer data per data processing terms. Financial Terms: Not fully specified in provided excerpt — fee schedule requires review. Critical Dates: Auto-renewal notification deadline: June 30, 2026 (180 days before December 31, 2026 renewal date). If Customer intends to terminate at end of initial term, notice must be given by June 30, 2026. Risk Allocation: Limitation of liability: Vendor capped at 3 months of fees paid (Section 13.2). FLAGGED — NON-STANDARD: 3 months is below market standard for enterprise SaaS agreements, which typically range from 6–12 months of annual fees. For a 2-year agreement at scale, this cap may be insufficient for data breach or platform failure scenarios. Mutual indemnification for third-party IP claims (Section 12.1) — each party indemnifies the other for claims arising from their own IP. This is standard. IP and Confidentiality: FLAGGED — REVIEW REQUIRED: Section 8.2 grants Vendor a perpetual license to aggregate and anonymize Customer data for product improvement. This is a broad data license provision. Acme Corp should confirm: (1) whether Customer data contains trade secrets or competitively sensitive information that should not be used for Vendor product improvement; (2) whether Customer\'s own customers have data use restrictions that would prohibit this license grant; (3) whether the aggregation and anonymization standards are defined and verifiable. Flagged Non-Standard Terms: (1) Section 13.2 — 3-month liability cap is below market standard; negotiate to 6–12 months of annual fees or annual contract value. (2) Section 8.2 — perpetual data license for product improvement should be reviewed against Customer\'s data handling obligations to its own customers before execution. (3) Section 4.3 — 180-day auto-renewal notice period is on the longer end; calendar the June 30, 2026 deadline immediately if executed.',
      note: 'The auto-renewal deadline with a specific calendar date (June 30, 2026) converts the abstract notice period into an actionable business requirement. The liability cap flag explains why 3 months is non-standard (market range is 6–12 months) rather than just noting it is below standard. The data license flag identifies the downstream compliance question (Customer\'s own customer data use restrictions) that the contract summary alone cannot answer.',
    },
  ],
});
