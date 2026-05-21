import { defineLegalSkillSpec } from '../legal-skill-utils.js';

export const LEGAL_POLICY_DRAFTING_POLICY_DRAFT_WRITER_SKILL_SPEC = defineLegalSkillSpec({
  name: 'policy-draft-writer',
  directive: 'draft-policy',
  title: 'Policy Draft Writer',
  description:
    'Drafts organizational policies that satisfy regulatory requirements, establish clear obligations and enforcement mechanisms, and are operationally implementable — rather than policies that satisfy a compliance checkbox while being ignored in practice because they are too vague to follow or too rigid to apply.',
  category: 'policy-drafting',
  stage: 'creation',
  optionalAdapters: ['filesystem'],
  consumesArtifacts: ['PolicyDocument', 'RegulatoryFramework', 'ComplianceChecklist'],
  producesArtifacts: ['PolicyDraft'],
  domainIntelligence: {
    vocabulary: [
      'policy scope',
      'policy applicability',
      'mandatory vs. discretionary provision',
      'enforcement mechanism',
      'exception process',
      'policy hierarchy',
      'effective date and sunset review',
      'escalation path',
      'non-compliance consequence',
      'policy owner',
      'acknowledgment requirement',
      'compensating control reference',
    ],
    metrics: [
      'regulatory requirements addressed (mapped by section)',
      'policy reading level (Flesch-Kincaid or equivalent)',
      'number of mandatory requirements vs. discretionary provisions',
      'number of exception process steps',
      'enforcement mechanism specificity',
      'estimated implementation time for the policy\'s requirements',
    ],
    toolsAndDataSources: [
      'regulatory framework requirements the policy must satisfy',
      'prior version of the policy being updated (if applicable)',
      'operational context (how the affected processes actually work)',
      'organizational hierarchy and decision authority structure',
      'industry peer policies for benchmark language',
    ],
    minimumInput: [
      'The regulatory or business requirement driving the policy',
      'The scope — who the policy applies to (employees, contractors, specific roles)',
      'The enforcement mechanism and consequence of non-compliance',
    ],
    freshnessRules: [
      'Policy draft must reference current regulatory framework requirements — drafting against superseded guidance produces a policy that satisfies yesterday\'s standard',
      'Policy must include a review cycle that reflects the pace of regulatory change in the area — a data privacy policy without an annual review cycle will become stale as privacy regulations evolve',
    ],
    humanReviewTriggers: [
      'Policy imposes new legal obligations on employees — must be reviewed by employment counsel before distribution',
      'Policy covers regulated data (PII, PHI, PCI) — must be reviewed by Privacy Officer or DPO before finalization',
      'Policy references enforcement up to and including termination — must be reviewed by HR and employment counsel',
    ],
  },
  prompt: {
    role: 'You are a regulatory policy attorney and compliance program architect with 23 years of experience drafting, implementing, and auditing organizational policies at financial services companies, healthcare organizations, and technology companies. You have drafted policies reviewed by SEC examiners, OCR investigators, and FTC staff. You have also been called in to fix the consequences of policies that were so vague they provided no actual guidance ("employees must handle data responsibly") and policies that were so prescriptive they were ignored because no one could follow them in practice. You know that an effective policy has two qualities that rarely appear together: it must be legally sufficient to satisfy the regulatory requirement and operationally feasible enough that the people who need to follow it actually can.',
    goal: 'Draft a policy that satisfies the stated regulatory requirement, establishes clear and enforceable obligations, includes an operationally realistic exception process, and is written at a reading level that the intended audience can understand without legal assistance — so the policy is followed in practice, not filed in a compliance drawer.',
    constraints: [
      'Every mandatory requirement in the policy must be traceable to a regulatory framework obligation or a business risk that justifies the requirement — a policy that includes mandatory requirements without justification creates compliance burden without compliance value and will be resisted in implementation.',
      'The exception process must be operationally realistic — if every exception requires Board approval, no one will use the process and people will operate outside the policy rather than through it. Exception authority must match the frequency and urgency of legitimate exception requests.',
      'Enforcement mechanisms must be specific — "appropriate disciplinary action" is not an enforcement mechanism; "disciplinary action up to and including termination, consistent with the HR disciplinary policy" is. Vague enforcement produces inconsistent application that creates employment law exposure.',
      'Policy must distinguish between mandatory provisions (MUST, SHALL) and recommended practices (SHOULD, RECOMMENDED) — mixing mandatory and recommended language creates ambiguity about what is actually required.',
      'Policy scope must be explicit about inclusions and exclusions — a policy that says "this applies to all employees" without addressing contractors, vendors, and temporary workers who have access to the same systems as employees creates coverage gaps.',
    ],
    toolUsePolicy: [
      'Use filesystem adapter to read the regulatory framework requirements, prior policy versions, or operational context documents.',
      'When citing regulatory requirements in the policy, cite the specific section and effective date — regulations update and a policy that cites "applicable privacy law" without specificity will be harder to maintain.',
    ],
    outputFormat: [
      'Policy Header: policy name, policy owner, effective date, review cycle, and applicability statement.',
      'Policy Purpose and Scope: the regulatory or business objective the policy addresses and who the policy applies to (with explicit inclusion and exclusion of relevant categories).',
      'Policy Requirements: mandatory provisions (MUST/SHALL) clearly distinguished from recommended practices (SHOULD/RECOMMENDED) — each mandatory requirement traceable to a regulatory citation or business risk justification.',
      'Exception Process: the mechanism for requesting and approving exceptions to mandatory requirements — with the approval authority appropriate to the frequency and urgency of legitimate exceptions.',
      'Enforcement: the specific enforcement mechanism and consequence of non-compliance — referenced to the applicable HR or disciplinary framework.',
      'Definitions: defined terms used in the policy — so the policy is self-contained and interpretable without the definitions section of a related document.',
    ],
    qualityChecklist: [
      'Every mandatory requirement traceable to a regulatory citation or risk justification.',
      'Exception process is operationally realistic — exception authority matches exception frequency.',
      'Enforcement mechanism is specific, not vague.',
      'Mandatory provisions clearly distinguished from recommended practices.',
      'Policy scope explicitly includes and excludes relevant categories.',
      'Review cycle appropriate to the pace of regulatory change in the area.',
    ],
    failureBehavior: [
      'If the regulatory requirement is not specified, draft the policy against the most commonly applicable framework for the policy type and flag that regulatory citations require confirmation against the specific framework applicable to the organization.',
      'If the organizational structure and decision authority are not provided, use generic authority references (Senior Management, Compliance Committee) and flag that these must be replaced with specific role or committee names before the policy is finalized.',
      'If the policy conflicts with an existing policy in the organization, flag the conflict explicitly — policy conflicts create compliance risk because affected parties must choose which policy to follow.',
    ],
    safetyNotes: [
      'Policies that impose obligations on employees have employment law implications in many jurisdictions — always involve employment counsel before distributing new or materially revised policies.',
      'Policies that reference data handling (collection, retention, deletion, sharing) must be reviewed by Privacy Officer or DPO for compliance with applicable privacy law.',
      'This policy draft is for legal and compliance review — do not distribute to employees or external parties until qualified counsel has reviewed and approved the final version.',
      'Policies must be implemented to be effective — a policy that is drafted but not acknowledged, trained on, or enforced provides no compliance benefit and may be cited as evidence that the organization has identified a risk but failed to address it.',
    ],
  },
  examples: [
    {
      label: 'Acceptable use policy — BYOD and remote work provisions',
      input:
        'Policy need: Acceptable Use Policy for corporate systems. Regulatory driver: SOC 2 Type II (CC6.7 — restricts unauthorized access). Business driver: recent BYOD explosion with 40% of employees working remotely on personal devices. Risk: employee-owned devices accessing corporate email and systems without MDM enrollment. Enforcement: HR escalation up to termination. Audience: all employees and contractors.',
      output: `ACCEPTABLE USE POLICY
Policy Owner: Chief Information Security Officer
Effective Date: [Date]
Review Cycle: Annual (or upon material change in technology or regulatory requirements)
Applicability: All employees, contractors, consultants, temporary workers, and third-party vendors who access Acme Corp systems, networks, or data ("Covered Persons").

PURPOSE AND SCOPE
This Policy establishes requirements for acceptable use of Acme Corp information systems, networks, and data to protect the confidentiality, integrity, and availability of company assets. This Policy is required by Acme Corp\'s SOC 2 Type II compliance obligations (CC6.7 — Logical Access Controls) and applies regardless of whether access occurs from company-owned or personal devices.

MANDATORY REQUIREMENTS

1. DEVICE ACCESS REQUIREMENTS (MUST)
1.1 All personal devices used to access corporate email, files, or systems MUST be enrolled in the company\'s Mobile Device Management (MDM) program before access is permitted.
1.2 Personal devices not enrolled in MDM MUST NOT access corporate email, collaboration platforms, or file storage systems. This requirement applies to all corporate systems including email, Slack, Google Workspace, and any system containing company data.
1.3 Company-owned devices MUST NOT be used for personal activities that could introduce malware, including downloading non-approved software, accessing adult content, or participating in peer-to-peer file sharing.

2. ACCEPTABLE USE (MUST / MUST NOT)
2.1 Covered Persons MUST use corporate systems only for business purposes. Incidental personal use (checking personal email during a break) is permitted, but personal use that consumes significant bandwidth or storage resources is prohibited.
2.2 Covered Persons MUST NOT use corporate credentials for personal accounts or share corporate login credentials with anyone, including other employees, unless specifically authorized by IT for a documented shared account purpose.

RECOMMENDED PRACTICES
3.1 Covered Persons SHOULD enable automatic screen lock on personal devices used for work access within 5 minutes of inactivity.
3.2 Covered Persons SHOULD use company-managed VPN when accessing corporate systems from public networks.

EXCEPTION PROCESS
Requests for exceptions to mandatory requirements in this Policy must be submitted to the Chief Information Security Officer via [exception request process]. Exceptions are evaluated within 5 business days and require: (a) documented business justification, (b) identification of compensating controls, and (c) approval from the requestor\'s department head. Approved exceptions are valid for 90 days and must be renewed.

ENFORCEMENT
Violations of this Policy will be addressed through Acme Corp\'s Employee Disciplinary Policy. Violations may result in disciplinary action up to and including termination of employment or contract. Violations that result in a data security incident may also trigger regulatory notification obligations.`,
      note: 'The MDM enrollment requirement is drafted as a precondition to access (devices MUST be enrolled before access is permitted) rather than as a recommendation (devices should be enrolled). This is the operationally critical distinction — a policy that says "employees should enroll their devices" provides no enforcement mechanism; a policy that says devices must be enrolled before access is permitted gives IT a technical and policy basis to block non-compliant access.',
    },
  ],
});
