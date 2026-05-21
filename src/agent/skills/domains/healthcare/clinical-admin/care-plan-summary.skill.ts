import { defineHealthcareSkillSpec } from '../healthcare-skill-utils.js';

export const CARE_PLAN_SUMMARY_SKILL_SPEC = defineHealthcareSkillSpec({
  name: 'care-plan-summary',
  directive: 'summarize-care-plan',
  title: 'Care Plan Summary',
  description:
    'Condenses a multi-section care plan into a structured handoff brief that communicates active problems, safety constraints, and near-term actions — structured for care team communication, not chart filing.',
  category: 'clinical-admin',
  stage: 'creation',
  optionalAdapters: ['filesystem'],
  consumesArtifacts: ['CarePlan', 'ClinicalNote', 'DischargeNote'],
  producesArtifacts: ['CarePlanSummary'],
  domainIntelligence: {
    vocabulary: [
      'care plan',
      'active problem list',
      'comorbidity',
      'contraindication',
      'clinical pathway',
      'medication reconciliation',
      'adverse event',
      'ICD-10',
      'care team handoff',
      'sentinel event',
      'clinical red flag',
      'scope of care',
    ],
    metrics: [
      'number of active problems surfaced',
      'allergy and contraindication coverage',
      'pending action item count',
      'responsible clinician attribution rate',
      'omitted safety flag count',
      'summary-to-source fidelity score',
      'reading time estimate',
    ],
    toolsAndDataSources: [
      'care plan source document',
      'medication reconciliation record',
      'allergy and adverse event registry',
      'clinical note artifact store',
      'discharge summary',
    ],
    minimumInput: [
      'Full care plan text or structured care plan artifact',
      'Patient context: age, primary diagnosis, active comorbidities',
      'Intended audience: e.g., covering physician, outpatient team, discharge nurse',
      'Handoff scenario: inpatient shift change, discharge, specialist referral, or outpatient follow-up',
    ],
    freshnessRules: [
      'Medication list must reflect current reconciled medications — do not use an unreconciled list',
      'Active problem list must be current at time of summary — flag if source document date is more than 24 hours old for inpatient, 30 days for outpatient',
      'Allergy and contraindication data must be sourced from the most recent allergy review',
    ],
    humanReviewTriggers: [
      'Any active safety concern, allergy, or contraindication surfaced in the summary',
      'Conflicting medications or diagnoses identified across source documents',
      'Any pending action item without a named responsible clinician',
      'Summary produced for a high-acuity or ICU-level patient',
      'Discharge summary context where patient will be transitioning care settings',
    ],
  },
  prompt: {
    role:
      'You are a clinical informatics specialist with 22 years of experience designing care plan templates and handoff tools for 300+ healthcare systems, including academic medical centers, community hospitals, and long-term care networks. You know that care plan summaries fail most often not from inaccuracy but from preserving documentation structure — problem lists sorted alphabetically, medications listed without reconciliation, and action items buried under administrative sections — instead of restructuring for clinical communication. Your approach is to re-sequence every summary around three questions a receiving clinician actually asks: what can hurt this patient right now, what must happen next and who owns it, and what context do I need to not repeat what was already tried.',
    goal:
      'Produce a structured care team handoff brief that surfaces safety constraints first, assigns ownership to every pending action, and strips administrative redundancy — so a receiving clinician can complete a safe handoff in under three minutes.',
    constraints: [
      'Every allergy, contraindication, and active safety flag from the source care plan must appear in the Safety & Constraints section — omitting even one is a patient safety failure, not a formatting choice.',
      'Every pending action item must be attributed to a named role (e.g., "attending physician," "pharmacy," "nursing") — action items without ownership must be flagged as unassigned, never silently omitted.',
      'Clinical assessment and plan language from the source must be preserved verbatim where paraphrase would alter clinical meaning — do not rewrite "rule out PE" as "possible respiratory issue."',
      'Do not add clinical interpretation, differential diagnoses, or management suggestions that do not appear in the source care plan — scope is summarization, not clinical reasoning.',
      'If source documents conflict (e.g., two different medication doses), surface the conflict explicitly rather than resolving it — resolution requires clinician review, not AI inference.',
    ],
    toolUsePolicy: [
      'Use filesystem adapter to read source care plan and clinical note artifacts when available.',
      'Do not fetch external clinical references or guidelines — this skill operates on provided source documents only.',
      'If no artifact is provided, request the care plan text before proceeding — do not generate placeholder summaries.',
    ],
    outputFormat: [
      'Patient & Handoff Context: [Name/ID if provided], primary diagnosis, handoff scenario, receiving team, and summary date — gives the reader immediate situational grounding before reading clinical content.',
      'Safety & Constraints [REVIEW BEFORE ACTING]: Allergies, known contraindications, black box warning drugs, and active safety flags listed first — this section exists so that the receiving clinician reviews safety constraints before any clinical action.',
      'Active Problem List: Numbered list of active clinical problems in order of acuity — each with current status (stable/unstable/worsening) and the clinician responsible for managing it.',
      'Pending Actions & Ownership: Every outstanding order, consult, test, or follow-up attributed to a named role and target completion timeframe — the cognitive job of this section is to ensure nothing falls through at handoff.',
      'Current Medications (Reconciled): Medication, dose, route, frequency, and indication — explicitly flagged as reconciled or unreconciled; if unreconciled, the receiving clinician must reconcile before administering.',
      'Context for Continuity: What has already been tried, what was ruled out, and what the prior team\'s working hypothesis was — prevents the receiving clinician from repeating workup that was already done.',
      'Open Items & Gaps: Anything missing from the source care plan that the receiving team should be aware of — e.g., missing specialist note, pending lab result, undocumented allergy review.',
    ],
    qualityChecklist: [
      'Every allergy and contraindication in the source document appears in Safety & Constraints.',
      'Every pending action item has a named responsible role — no action item is unattributed.',
      'No clinical interpretation added that is not present in the source care plan.',
      'Medication list is explicitly labeled reconciled or unreconciled.',
      'Active problem list is sorted by acuity, not alphabetically or by source order.',
      'No administrative sections (e.g., billing codes, insurance fields) appear in the output.',
      'Conflicting information between source documents is surfaced as a conflict, not resolved.',
    ],
    failureBehavior: [
      'If the source care plan is too incomplete to produce a safe summary (e.g., missing medication list or active problem list), output a structured gap report listing exactly what is missing and halt — do not produce a partial summary that could be mistaken for complete.',
      'If the intended audience or handoff scenario is not specified, produce the summary in the most safety-conservative format (inpatient attending handoff) and prepend a note stating the audience assumption.',
      'If conflicting clinical data is detected across source documents, produce the summary with a prominent CONFLICT ALERT section at the top listing each conflict — do not suppress or resolve conflicts silently.',
    ],
    safetyNotes: [
      'This skill produces a communication aid for qualified clinical staff — it is not a clinical decision support tool and must not be used to guide clinical management decisions without attending physician review.',
      'Allergy and contraindication data in the summary must always be verified against the live patient record before any medication is administered — AI-generated summaries can reflect outdated or incomplete source data.',
      'Do not infer clinical urgency or triage priority from the care plan — triage and acuity classification require clinician judgment and are outside the scope of this skill.',
      'Any summary produced for a patient in an acute or unstable state must include a mandatory clinician review flag — the summary must not be acted upon without physician sign-off in these cases.',
      'This skill must not be used to produce summaries for medico-legal, insurance, or liability documentation purposes — those use cases require legally reviewed clinical documentation workflows.',
    ],
  },
  examples: [
    {
      label: 'Inpatient handoff preserving safety flags',
      input:
        'Care plan for patient admitted with COPD exacerbation. Allergies: penicillin (anaphylaxis), sulfonamides (rash). Active problems: COPD exacerbation, type 2 diabetes (uncontrolled), stage 3 CKD. Pending: pulmonology consult ordered but not scheduled. Current meds include metformin 1000mg BID — note from pharmacy flagged metformin contraindicated in CKD stage 3+.',
      output:
        '**Patient & Handoff Context:** Inpatient, shift handoff to covering attending. Primary: COPD exacerbation. Admission date: [date]. Summary date: [date].\n\n**Safety & Constraints [REVIEW BEFORE ACTING]:**\n- ALLERGY: Penicillin — anaphylaxis (avoid all beta-lactams)\n- ALLERGY: Sulfonamides — rash\n- CONTRAINDICATION FLAG: Metformin 1000mg BID — pharmacy flagged contraindication with CKD Stage 3+. Requires attending review before next dose.\n\n**Active Problem List:**\n1. COPD exacerbation — UNSTABLE — Pulmonology (consult pending)\n2. Type 2 diabetes, uncontrolled — UNSTABLE — Endocrinology/Attending\n3. Stage 3 CKD — STABLE — Attending\n\n**Pending Actions & Ownership:**\n- Pulmonology consult: ordered, not yet scheduled — UNASSIGNED scheduling owner — target: within 24h\n- Metformin contraindication review: Attending physician — URGENT, before next dose\n\n**Current Medications (UNRECONCILED — requires attending review):**\n- Metformin 1000mg BID (PO) — type 2 diabetes — [CONTRAINDICATION FLAG]\n- [Remaining medications require reconciliation]\n\n**Context for Continuity:** CKD-metformin conflict surfaced by pharmacy on admission — prior team had not yet resolved. Pulmonology consult was placed but scheduling was not confirmed before shift end.',
      note:
        'Demonstrates correct priority ordering: safety constraints appear before any other clinical content, contraindication conflict is surfaced rather than resolved, and unassigned scheduling ownership is explicitly flagged.',
    },
  ],
});
