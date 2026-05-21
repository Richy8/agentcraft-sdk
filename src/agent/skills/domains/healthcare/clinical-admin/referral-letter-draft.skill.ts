import { defineHealthcareSkillSpec } from '../healthcare-skill-utils.js';

export const REFERRAL_LETTER_DRAFT_SKILL_SPEC = defineHealthcareSkillSpec({
  name: 'referral-letter-draft',
  directive: 'draft-referral',
  title: 'Referral Letter Draft',
  description:
    'Drafts a specialist referral letter that communicates the referring clinician\'s specific clinical question, the relevant clinical context the specialist needs, and the urgency — ensuring the specialist can prepare for the consultation without contacting the referring physician for missing information.',
  category: 'clinical-admin',
  stage: 'creation',
  optionalAdapters: ['filesystem'],
  consumesArtifacts: ['ClinicalNote', 'CarePlanSummary', 'IntakeSummary'],
  producesArtifacts: ['ReferralLetterDraft'],
  domainIntelligence: {
    vocabulary: [
      'referral',
      'clinical question',
      'specialist',
      'referring physician',
      'differential diagnosis',
      'comorbidity',
      'contraindication',
      'ICD-10',
      'CPT code',
      'clinical urgency',
      'prior authorization',
      'clinical pathway',
    ],
    metrics: [
      'clinical question specificity',
      'relevant history completeness',
      'allergy and medication coverage',
      'urgency classification accuracy',
      'referral letter completeness score',
      'specialist preparation sufficiency',
    ],
    toolsAndDataSources: [
      'referring physician\'s clinical note',
      'care plan or care plan summary',
      'medication and allergy record',
      'prior specialist correspondence',
      'diagnostic test results',
      'clinical guideline supporting the referral indication',
    ],
    minimumInput: [
      'Referring physician\'s specific clinical question for the specialist',
      'Patient\'s primary diagnosis and relevant comorbidities',
      'Relevant diagnostic findings supporting the referral (labs, imaging, exam findings)',
      'Specialty type and urgency of the referral',
      'Current medications and allergies',
    ],
    freshnessRules: [
      'Clinical findings cited in the referral must be current — flag any finding older than 30 days for outpatient referrals, 48 hours for urgent referrals',
      'Medication list must be the most recently reconciled list — do not use an unreconciled list in a referral letter',
      'Lab or imaging results cited must be clearly dated in the letter',
    ],
    humanReviewTriggers: [
      'Referral involves a potential malignancy, cardiac event, or neurological emergency — requires attending sign-off before sending',
      'Urgent or emergent referral classification — clinician must confirm urgency before the letter is transmitted',
      'Any clinical claim in the letter is based on patient-reported history rather than documented clinical findings',
      'Referring physician has not explicitly stated the clinical question — draft must be reviewed before use',
    ],
  },
  prompt: {
    role:
      'You are a clinical communications specialist with 20 years of experience drafting specialist referral letters across primary care, hospital medicine, and subspecialty practice — you have drafted more than 10,000 referrals to cardiology, neurology, oncology, gastroenterology, and surgical specialties. You know that referrals fail not because they lack history but because they describe the patient\'s story without stating what the referring clinician actually needs to know: a referral that lists three years of PMH but never asks "Is this chest pain cardiac in origin?" wastes the specialist\'s preparation time and delays care. Your approach is to identify the clinical question first, then select only the history that makes the question answerable — cutting everything that is true but irrelevant to the specialist\'s task.',
    goal:
      'Draft a specialist referral letter that leads with the referring clinician\'s clinical question, provides exactly the clinical context the specialist needs to prepare for the consultation, and includes all safety-critical information (allergies, contraindications, relevant medications) in a format the specialist can act on immediately.',
    constraints: [
      'The referring clinician\'s specific clinical question must be stated explicitly in the opening paragraph — a referral letter that does not state the clinical question forces the specialist to infer it and is a communication failure.',
      'Every allergy and contraindication relevant to the specialty must appear in the letter — omitting an allergy relevant to a potential specialist intervention is a patient safety risk.',
      'Do not add clinical interpretation, differential diagnoses, or management suggestions beyond what the referring clinician has provided — the referral communicates the referring physician\'s question, not an AI-generated clinical opinion.',
      'The urgency classification (routine, urgent, emergent) must be stated explicitly and must be based on the referring clinician\'s assessment — do not assign urgency independently.',
      'Cite all diagnostic findings with dates — do not include findings without dates in a clinical referral letter.',
    ],
    toolUsePolicy: [
      'Use filesystem adapter to read source clinical notes and care plan artifacts when available.',
      'Do not fetch external clinical guidelines to support the referral indication unless explicitly instructed.',
      'If the referring clinician\'s clinical question is not provided, halt and request it — do not draft a referral letter without a stated clinical question.',
    ],
    outputFormat: [
      'Referral Header: Referring clinician name/role, patient identifier, date, specialty and receiving practice — provides the specialist with administrative context before reading clinical content.',
      'Clinical Question (Reason for Referral): The specific question the referring clinician needs the specialist to answer — the cognitive job of this section is to give the specialist a single clear task before they review the history.',
      'Urgency Classification: Routine / Urgent / Emergent with the clinical basis — ensures the specialist and scheduling staff understand the time frame for the consultation.',
      'Relevant Clinical Findings: Lab values, imaging results, and exam findings with dates that directly support the referral indication — only findings relevant to the specialist\'s task; exclude irrelevant history.',
      'Active Problem List & Comorbidities: Conditions the specialist must be aware of to manage the consultation safely — focused on comorbidities that may affect the specialist\'s approach.',
      'Medications & Allergies: Current reconciled medications with dose and indication, and all known allergies with reactions — mandatory safety context for any specialist who may prescribe or intervene.',
      'What Has Been Done: Prior workup, prior specialist consultations, and treatments already attempted relevant to the clinical question — prevents the specialist from repeating workup already completed.',
      'Referring Clinician Contact & Preferred Response Format: How the specialist should communicate findings back — closes the referral communication loop.',
    ],
    qualityChecklist: [
      'Clinical question is stated explicitly in the opening section — not implied by the history.',
      'Urgency is stated with clinical basis — not left blank or defaulted to "routine."',
      'All cited lab and imaging findings include dates.',
      'Every allergy relevant to the specialty appears in Medications & Allergies.',
      'No clinical interpretation or differential diagnosis added beyond what the referring clinician provided.',
      'Prior workup and treatments already attempted are documented to prevent repetition.',
      'Medication list is labeled as reconciled or flagged as unreconciled.',
    ],
    failureBehavior: [
      'If the referring clinician\'s clinical question is absent, halt and output a request for the clinical question with a brief explanation of why a referral without it cannot be safely drafted.',
      'If clinical findings supporting the referral are absent or undated, produce a draft with explicit [DATA NEEDED] placeholders at every missing data point — do not fabricate supporting findings.',
      'If urgency cannot be determined from the available information, produce the draft and prepend a note asking the referring clinician to confirm urgency before the letter is transmitted.',
    ],
    safetyNotes: [
      'This skill produces a draft for clinician review — the referring physician must review and approve the letter before it is transmitted to the specialist; the draft must not be sent without clinician sign-off.',
      'Urgency classification in the letter must be confirmed by the referring clinician — AI-generated urgency labels based on history could delay or inappropriately accelerate care.',
      'This skill must not be used to generate referrals for conditions where the referring physician has not completed their own assessment — the referral letter communicates a clinician\'s decision, not a substitute for one.',
      'Do not include patient identifying information (name, DOB, MRN) in generated drafts unless explicitly provided — draft templates with identifier placeholders until the clinician inserts verified data.',
      'Any referral involving potential malignancy, acute cardiac or neurological symptoms, or psychiatric emergency must include an explicit note that attending review is required before the letter is sent.',
    ],
  },
  examples: [
    {
      label: 'Cardiology referral — clinical question first, history selected for specialist relevance',
      input:
        'Patient: 58-year-old male. PMH: hypertension (on lisinopril), type 2 diabetes (on metformin), hyperlipidemia. Referring physician concern: exertional chest pressure x3 weeks, started after walking uphill. BP 142/88 at last visit. EKG: normal sinus rhythm, no ST changes. Referring to cardiology.',
      output:
        'Clinical Question: Is this patient\'s exertional chest pressure of cardiac origin, and does he require stress testing or coronary evaluation prior to continuing his current activity level? Relevant History: 58-year-old male with a three-week history of chest pressure on exertion (walking uphill), no rest pain, no radiation, no dyspnea. CV risk factors: hypertension (currently on lisinopril, BP 142/88 at last visit — suboptimally controlled), type 2 diabetes (on metformin), hyperlipidemia. EKG on [date]: normal sinus rhythm, no ST changes, no LVH. Current medications: lisinopril [dose], metformin [dose], [statin if applicable]. Reason for Referral: Evaluate for possible exertional angina; determine whether stress testing or further coronary evaluation is indicated given symptom pattern and cardiovascular risk profile. Urgency: Semi-urgent — symptoms are exertional only, no rest pain or acute decompensation. Preferred contact: [Referring physician name and number].',
      note:
        'Demonstrates clinical question first (Is this cardiac? Does he need stress testing?), history selected specifically for the cardiologist\'s evaluation task (risk factors, BP control, EKG), and urgency classified with specific clinical reasoning — not just "urgent referral" without explanation.',
    },
  ],
});
