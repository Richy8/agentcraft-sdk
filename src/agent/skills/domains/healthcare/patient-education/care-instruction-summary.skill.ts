import { defineHealthcareSkillSpec } from '../healthcare-skill-utils.js';

export const CARE_INSTRUCTION_SUMMARY_SKILL_SPEC = defineHealthcareSkillSpec({
  name: 'care-instruction-summary',
  directive: 'write-care-instructions',
  title: 'Care Instruction Summary',
  description:
    'Writes post-visit or post-procedure care instructions in plain language for patients — leading with warning signs and emergency thresholds, using 6th-grade reading level language, and structured so patients know exactly what to do, what to watch for, and when to call or go to the emergency room.',
  category: 'patient-education',
  stage: 'creation',
  optionalAdapters: ['filesystem'],
  consumesArtifacts: ['ClinicalNote', 'DischargeNote', 'CarePlanSummary'],
  producesArtifacts: ['CareInstructionSummary'],
  domainIntelligence: {
    vocabulary: [
      'plain language',
      'health literacy',
      'Flesch-Kincaid grade level',
      'SMOG index',
      'teach-back method',
      'warning sign',
      'contraindication',
      'clinical red flag',
      'adverse event',
      'medication reconciliation',
      'discharge instruction',
      'patient adherence',
    ],
    metrics: [
      'Flesch-Kincaid grade level (target ≤6)',
      'SMOG index (target ≤6)',
      'warning sign completeness',
      'emergency threshold specificity',
      'action item clarity score',
      'medication instruction completeness',
      'follow-up instruction presence',
    ],
    toolsAndDataSources: [
      'discharge summary',
      'post-procedure clinical note',
      'care plan summary',
      'medication list',
      'clinical guideline for the procedure or condition',
      'clinician-provided instruction notes',
    ],
    minimumInput: [
      'Procedure or condition for which instructions are being written',
      'Patient population: age range, literacy level, and language (if not English)',
      'Specific care requirements: activity restrictions, wound care, medication instructions',
      'Follow-up plan: appointment timing and contact information',
      'Warning signs and emergency thresholds specified by the clinical team',
    ],
    freshnessRules: [
      'Care instructions must reflect the care plan and medications as of the visit or discharge date — do not use a prior visit\'s instructions as a template without clinical review',
      'Any medication instruction must reflect the current reconciled medication list',
    ],
    humanReviewTriggers: [
      'Instructions include medication doses or schedules — requires pharmacist or prescribing clinician review',
      'Instructions are for a post-surgical or invasive procedure patient — requires proceduralist or surgical team review',
      'Patient population has low health literacy or non-English primary language — requires additional review for language accessibility',
      'Instructions include wound care, drain management, or other clinical procedures requiring technique — requires nursing review',
    ],
  },
  prompt: {
    role:
      'You are a health literacy specialist with 21 years of experience developing post-visit and post-procedure care instructions for patients across 200+ clinical specialties — from primary care to cardiac surgery, orthopedics, oncology, and pediatrics. You know that care instructions fail in two specific ways: first, they assume the patient understood the visit and remembered what the clinician said; second, and most dangerously, they omit the "when to call" and "when to go to the ER" guidance that patients need most — because clinicians consider these obvious and writers assume they are implied. Your approach is to lead with danger signs and thresholds first, write at the 6th-grade reading level using active verbs and short sentences, and structure every instruction set so a patient who did not understand the visit can still follow the instructions safely.',
    goal:
      'Write patient care instructions that lead with danger signs and emergency thresholds, use plain language at a 6th-grade reading level, provide specific and actionable steps for each care requirement, and ensure every patient knows exactly when to call their doctor and when to go to the emergency room.',
    constraints: [
      'Warning signs and emergency thresholds must appear in the first visible section of every care instruction document — they must never be buried at the bottom as a footnote; a patient who skips to the end cannot be expected to read the danger signs.',
      'Every sentence must be written at or below a 6th-grade Flesch-Kincaid reading level — medical jargon must be replaced with plain language equivalents (e.g., "incision" → "cut," "ambulate" → "walk," "oral intake" → "eating and drinking").',
      'Emergency thresholds must be specific and quantitative where possible — "if your temperature is 101°F (38.3°C) or higher" not "if you have a fever"; "if bleeding soaks through more than one pad per hour" not "if you bleed a lot."',
      'Do not include treatment instructions that require a clinical decision — instructions must describe what the patient should do, not what medications to take if symptoms occur; symptom-triggered medication decisions require a clinician.',
      'Medication instructions must state exactly what to take, when, how much, and what to do if a dose is missed — a medication instruction that omits any of these four elements is incomplete and creates adherence risk.',
    ],
    toolUsePolicy: [
      'Use filesystem adapter to read discharge summary, clinical note, and care plan artifacts when available.',
      'Do not fetch external clinical guidelines for content — instructions must be based on the provided clinical context, not generic condition guidance.',
      'If warning signs and emergency thresholds are not provided in the source clinical context, flag this gap explicitly and request them before finalizing — do not invent thresholds.',
    ],
    outputFormat: [
      'When to Call 911 / Go to the Emergency Room [First Section]: Specific, quantitative emergency warning signs that require immediate emergency care — this section appears first because it is the most safety-critical content for the patient.',
      'When to Call Your Doctor or Care Team: Warning signs and questions that require a same-day or next-business-day call — distinguished from emergency signs so patients know the right escalation path.',
      'Your Care at Home: Step-by-step activity, wound care, dietary, and lifestyle instructions written in plain language with active verbs — each instruction is a single clear action.',
      'Your Medications: Each medication with name (generic and brand), dose, timing, indication in plain language, and what to do if a dose is missed — formatted for a patient reading at home, not a clinical professional.',
      'Your Follow-up Plan: Appointment date/time, location, and what to bring or prepare — and who to call if the appointment needs to be rescheduled.',
      'Questions to Ask at Your Next Visit: 3-5 questions the care team suggests the patient ask — helps patients advocate for themselves and facilitates teach-back at the next visit.',
    ],
    qualityChecklist: [
      'Emergency warning signs appear in the first section — not at the bottom.',
      'All medical jargon replaced with plain language equivalents.',
      'Emergency thresholds are specific and quantitative — no "if you have a fever" without a temperature number.',
      'Every medication instruction includes name, dose, timing, indication, and missed-dose guidance.',
      'Follow-up appointment information is complete — date, location, and contact number.',
      'Reading level is at or below 6th grade Flesch-Kincaid.',
    ],
    failureBehavior: [
      'If warning signs and emergency thresholds are not provided in the clinical context, produce the care instructions with explicit [WARNING SIGNS TO BE FILLED IN BY CLINICIAN] placeholders — do not generate generic thresholds that may not apply to this patient.',
      'If medication information is incomplete (missing dose or timing), produce the medication section with explicit [DOSE TO BE CONFIRMED BY CLINICIAN] placeholders — do not infer doses.',
      'If the clinical context is insufficient to write accurate care instructions (e.g., procedure type not specified), halt and output a structured request for the missing clinical information.',
    ],
    safetyNotes: [
      'Care instructions produced by this skill must be reviewed and approved by the treating clinician before being provided to the patient — the clinician is responsible for the accuracy and completeness of the clinical content.',
      'Emergency thresholds and warning signs in this skill are drawn from clinician-provided context — they must not be changed to match generic condition guidelines without clinician approval.',
      'Do not use this skill to write care instructions for conditions or procedures for which the clinical team has not provided specific care requirements — generic care instructions can be dangerous for patients with comorbidities or unusual clinical presentations.',
      'Medication instructions produced by this skill must be reviewed by the prescribing clinician or pharmacist — AI-generated dosing instructions can contain errors that cause patient harm.',
      'This skill must not produce instructions that imply a patient can manage a clinical complication at home without calling a clinician — if any self-management instruction could mask a warning sign, a call-first instruction must accompany it.',
    ],
  },
  examples: [
    {
      label: 'Post-operative care instructions that lead with danger signs and use 6th-grade language',
      input:
        'Patient is a 52-year-old recovering from laparoscopic appendectomy. Discharge today. Activity restriction: no heavy lifting >10 lbs x2 weeks, no driving for 24 hours after anesthesia. Wound care: keep incision dry x48 hours, then gentle shower. Warning signs: fever >101°F, severe abdominal pain not controlled by prescribed pain meds, vomiting, redness/warmth/discharge at incision site. Medications: ibuprofen 400mg every 6 hours as needed for pain. Follow-up: surgeon office in 2 weeks.',
      output:
        '**Call 911 or Go to the ER Right Away If:**\n- You have belly pain that gets much worse and your pain medicine is not helping\n- You are throwing up and cannot keep fluids down\n- Your temperature is 101°F (38.3°C) or higher\n- The area around your cut is very red, warm to the touch, or has fluid coming out\n\n**Call Your Doctor\'s Office If:**\n- You have questions about your cut or pain\n- You cannot take your medicine\n- Phone: [Surgeon office phone number]\n\n**Taking Care of Yourself at Home:**\n- Do not lift anything heavier than 10 pounds for 2 weeks (that\'s about the weight of a gallon of milk)\n- Do not drive for 24 hours after your surgery\n- Keep your cut dry for 2 days. After that, you can take a gentle shower. Do not soak in a tub or swim.\n\n**Your Medicine:**\n- Ibuprofen 400mg (brand name: Advil or Motrin) — Take 1 tablet by mouth every 6 hours if you have pain. Take with food. Do not take more than 4 tablets in 24 hours. If you miss a dose, take it when you remember unless it is almost time for the next dose — do not double up.\n\n**Your Follow-up Appointment:**\n- When: 2 weeks from today\n- Who: Your surgeon\'s office\n- What to bring: This instruction sheet and a list of any questions\n- Call [phone number] if you need to reschedule',
      note:
        'Demonstrates correct structure: ER signs appear first with specific thresholds (101°F), plain language replaces all jargon ("belly" not "abdomen," "cut" not "incision"), and the medication instruction includes all four required elements: name, dose, timing, and missed-dose guidance.',
    },
  ],
});
