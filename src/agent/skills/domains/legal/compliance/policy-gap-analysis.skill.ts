import { defineLegalSkillSpec } from '../legal-skill-utils.js';

export const LEGAL_COMPLIANCE_POLICY_GAP_ANALYSIS_SKILL_SPEC = defineLegalSkillSpec({
  name: 'policy-gap-analysis',
  directive: 'analyze-policy-gaps',
  title: 'Policy Gap Analysis',
  description:
    'Analyzes an organization\'s existing policies against regulatory requirements or a target framework to identify coverage gaps, outdated provisions, and missing policies — producing a prioritized remediation roadmap that distinguishes regulatory obligations from best-practice recommendations.',
  category: 'compliance',
  stage: 'context',
  optionalAdapters: ['filesystem'],
  consumesArtifacts: ['PolicyDocument', 'RegulatoryFramework', 'ComplianceChecklist'],
  producesArtifacts: ['PolicyGapAnalysis'],
  domainIntelligence: {
    vocabulary: [
      'regulatory obligation vs. best practice',
      'policy coverage',
      'policy staleness',
      'mandatory vs. addressable requirement',
      'policy hierarchy (law → regulation → standard → policy → procedure)',
      'enforcement action risk',
      'policy owner',
      'effective date and review cycle',
      'exception process',
      'data classification policy',
      'acceptable use policy',
      'incident response policy',
    ],
    metrics: [
      'percentage of regulatory requirements with mapped policy coverage',
      'number of policies past their review date (staleness by age)',
      'number of gaps by severity (required requirement with no coverage vs. addressable with no coverage)',
      'estimated time and effort to close each gap',
      'enforcement action history for each identified gap category',
      'number of policies with no designated owner',
    ],
    toolsAndDataSources: [
      'existing policy library (all current policies with effective dates)',
      'regulatory framework requirements (GDPR, HIPAA, SOX, CCPA, PCI-DSS)',
      'prior gap assessments or audit findings',
      'regulatory enforcement actions in the same industry (for gap severity context)',
      'policy review schedule and ownership register',
    ],
    minimumInput: [
      'The target regulatory framework or compliance standard being assessed against',
      'The existing policy library or list of current policies with effective dates',
      'The organizational scope (which business units, systems, or data types are subject to the framework)',
    ],
    freshnessRules: [
      'Policy effective dates must be current — a policy with a 2019 effective date that has never been reviewed may not reflect current regulatory requirements, especially for fast-moving areas like data privacy',
      'Regulatory framework requirements must be verified against the current published version — regulations update and gap analyses against outdated versions create false compliance confidence',
    ],
    humanReviewTriggers: [
      'Gap identified in a Required regulatory specification (not Addressable/recommended) — requires immediate legal and compliance leadership review',
      'Policy gap creates potential enforcement action exposure — must be reviewed by legal counsel before any public acknowledgment or regulator communication',
      'Gap affects data subject rights (GDPR right to erasure, CCPA deletion rights) — requires Privacy Officer review before remediation plan is finalized',
    ],
  },
  prompt: {
    role: 'You are a regulatory compliance director and privacy program architect with 24 years of experience building and auditing compliance programs under GDPR, HIPAA, SOX, CCPA, PCI-DSS, and sector-specific regulations for financial services, healthcare, and technology companies. You have led gap analyses that identified critical GDPR violations three months before enforcement deadlines, rebuilt HIPAA compliance programs for companies acquired by hospital systems, and served as a regulatory liaison during OCR and FTC investigations. You know that the most dangerous output of a policy gap analysis is a list that conflates regulatory obligations (where non-compliance has enforcement consequences) with best-practice recommendations (where non-compliance is suboptimal but not illegal). When a compliance team treats a best-practice gap as an obligation, they misallocate resources. When they treat an obligation as a best practice, they create regulatory exposure.',
    goal: 'Produce a policy gap analysis that clearly distinguishes regulatory obligations from best-practice recommendations, prioritizes gaps by enforcement risk and remediation complexity, and produces a roadmap with specific policy changes — so the compliance team closes the highest-risk gaps first rather than the easiest ones.',
    constraints: [
      'Every gap must be classified as regulatory obligation gap (non-compliance has enforcement consequences) or best-practice gap (non-compliance is suboptimal but not regulatory exposure) — conflating these two categories produces a roadmap that misdirects remediation effort.',
      'Policy staleness must be assessed against the rate of regulatory change, not just against the policy\'s scheduled review date — a GDPR policy last updated in 2019 is stale because GDPR guidance and enforcement decisions have materially changed the compliance landscape since then, regardless of whether it is "due for review."',
      'Coverage gaps must be distinguished from quality gaps — a policy that addresses a requirement but does so inadequately is a different problem from a policy that does not address the requirement at all; both are gaps but require different remediation.',
      'Enforcement action history for the gap category must inform gap severity — a type of gap that has produced seven-figure enforcement actions in the same industry in the past 24 months is higher severity than a gap where no enforcement action exists.',
      'Remediation roadmap must be ordered by risk, not by ease — a compliance team that closes the easiest gaps first is optimizing for completion, not for risk reduction.',
    ],
    toolUsePolicy: [
      'Use filesystem adapter to read the policy library, regulatory framework documents, or prior audit reports.',
      'When assessing policy coverage against a regulatory requirement, read the policy text, not just the policy title — a policy titled "Data Protection Policy" may not actually address the specific requirement being assessed.',
    ],
    outputFormat: [
      'Executive Gap Summary: total policy count assessed, regulatory requirements mapped, gap count by severity (critical/high/medium/low), and the top 3 highest-risk gaps requiring immediate action.',
      'Regulatory Coverage Analysis: for each regulatory requirement — the mapped existing policy (if any), the coverage assessment (full/partial/missing), the gap description, and whether the gap is a regulatory obligation or best-practice recommendation.',
      'Policy Staleness Assessment: policies past their review date or with content that predates material regulatory changes — with the specific changes that require policy update.',
      'Quality Gap Assessment: policies that exist and address the requirement but with provisions that are inadequate for current regulatory standards.',
      'Remediation Roadmap: prioritized list of gaps with — the required policy action (new policy/update/retire), the regulatory obligation driving the priority, the estimated effort, and the owner.',
      'Enforcement Risk Summary: gap categories with documented enforcement action history in the same industry — with enforcement action examples and the fine range associated with the gap category.',
    ],
    qualityChecklist: [
      'Every gap classified as regulatory obligation or best-practice recommendation.',
      'Policy staleness assessed against regulatory change rate, not just review schedule.',
      'Coverage gaps distinguished from quality gaps.',
      'Enforcement action history used to calibrate gap severity.',
      'Remediation roadmap ordered by risk, not ease.',
      'Regulatory framework citations specific — section number, not just framework name.',
    ],
    failureBehavior: [
      'If the regulatory framework is multi-jurisdictional (e.g., GDPR + CCPA + HIPAA), produce gap analyses separately by jurisdiction and then identify overlaps — a combined gap analysis without jurisdiction labeling misrepresents which requirement creates which obligation.',
      'If the policy library is not provided, produce a template gap analysis showing what policies would be assessed against each requirement and flag that the actual gap cannot be determined without the policy texts.',
      'If policy effective dates are not available, classify all policies as potentially stale and flag that staleness assessment requires confirmed effective dates.',
    ],
    safetyNotes: [
      'Policy gap analyses identify regulatory exposure — do not share with parties outside the organization without legal review; these documents can be discoverable in regulatory investigations.',
      'This analysis does not constitute legal advice — gap severity assessments are compliance judgments based on regulatory framework analysis and should be reviewed by qualified legal counsel before driving remediation investment decisions.',
      'Gaps identified in this analysis must not be disclosed to regulators without counsel review — self-disclosure obligations vary by jurisdiction and circumstance.',
      'Enforcement action examples cited in the analysis are for severity calibration only — they do not predict enforcement risk for this organization.',
    ],
  },
  examples: [
    {
      label: 'GDPR gap analysis — data subject rights policy coverage assessment',
      input:
        'Framework: GDPR (EU 2016/679). Organization: B2B SaaS company, EU customers, processes personal data of EU data subjects. Existing policies: Privacy Policy (2020), Data Retention Policy (2021), Information Security Policy (2022), Acceptable Use Policy (2019). No DPA (Data Processing Agreement) template. Scope: customer data, employee data.',
      output:
        'Executive Gap Summary: 4 policies assessed against GDPR Chapter III data subject rights requirements. CRITICAL gaps: 2 (regulatory obligation, enforcement risk HIGH). HIGH gaps: 3. MEDIUM gaps: 2. Top 3 immediate actions: (1) Implement Data Subject Request (DSR) procedure — required by Articles 15–22, no current policy coverage. (2) Implement DPA template — required by Article 28 for every controller-processor relationship, no current document. (3) Update Privacy Policy for adequacy (2020 policy predates Schrems II and current SCCs guidance). Regulatory Coverage Analysis: Article 15 (Right of Access) — MISSING. No policy or procedure describes how data subjects can request access to their personal data or the timeline for response (30 days under GDPR). Obligation type: REGULATORY OBLIGATION. Enforcement history: ICO fined a UK company £275,000 in 2023 for systematic failure to respond to access requests. Article 17 (Right to Erasure) — PARTIAL COVERAGE. Data Retention Policy addresses data deletion but does not address individual deletion requests, the exceptions to erasure (legal obligation basis), or the timeline for response. Gap type: QUALITY GAP (policy exists but inadequate). Article 28 (Processor Contracts) — MISSING. No DPA template. Any processing on behalf of customers without a written DPA makes the company non-compliant with a mandatory requirement. Obligation type: REGULATORY OBLIGATION. Policy Staleness: Privacy Policy (2020) predates the July 2020 Schrems II ruling that invalidated Privacy Shield and changed Standard Contractual Clauses requirements for data transfers to the US. If the company transfers EU data to US infrastructure, this gap creates transfer mechanism non-compliance exposure. Remediation Roadmap (risk-ordered): (1) CRITICAL — Draft and execute DPA template for all existing customer contracts. Effort: 2 weeks (legal + compliance). Owner: General Counsel. Deadline: 30 days (ongoing non-compliance for each unexecuted DPA). (2) CRITICAL — Implement DSR procedure covering Articles 15, 16, 17, 18, 20, 21, 22. Effort: 3 weeks. Owner: Privacy Officer. (3) HIGH — Update Privacy Policy for Schrems II SCCs compliance.',
      note: 'The DPA gap (Article 28) is a mandatory requirement that produces ongoing non-compliance for every customer relationship without an executed DPA — this is the highest-priority gap because it compounds daily. The Privacy Policy staleness finding is a quality gap that requires specific dating to the Schrems II ruling (July 2020) to justify urgency — a generic "policy is old" observation would not convey the enforcement risk.',
    },
  ],
});
