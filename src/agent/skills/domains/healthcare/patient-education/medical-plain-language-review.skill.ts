import { defineHealthcareSkillSpec } from '../healthcare-skill-utils.js';

export const MEDICAL_PLAIN_LANGUAGE_REVIEW_SKILL_SPEC = defineHealthcareSkillSpec({
  name: 'medical-plain-language-review',
  directive: 'review-plain-language',
  title: 'Medical Plain Language Review',
  description:
    'Reviews clinical or patient-facing documents for plain language compliance — assessing Flesch-Kincaid and SMOG reading level, identifying medical jargon, and providing specific rewrites that achieve the target reading level without losing clinical accuracy.',
  category: 'patient-education',
  stage: 'review',
  optionalAdapters: ['filesystem'],
  consumesArtifacts: ['PatientEducationDraft', 'CareInstructionSummary', 'ClinicalNote'],
  producesArtifacts: ['MedicalPlainLanguageReview'],
  domainIntelligence: {
    vocabulary: [
      'Flesch-Kincaid Grade Level',
      'SMOG index',
      'health literacy',
      'plain language',
      'readability score',
      'active voice',
      'medical jargon',
      'polysyllabic word',
      'teach-back method',
      'sentence complexity',
      'patient comprehension',
      'plain language equivalent',
    ],
    metrics: [
      'Flesch-Kincaid Grade Level (target ≤6 for patient education)',
      'SMOG index (target ≤6)',
      'average sentence length (target ≤15 words)',
      'polysyllabic word density (words >3 syllables per 100 words)',
      'passive voice sentence count',
      'jargon term count with plain language equivalents available',
      'clinical accuracy preservation score after rewrite',
    ],
    toolsAndDataSources: [
      'patient education draft document',
      'care instruction summary artifact',
      'Flesch-Kincaid readability formula',
      'SMOG readability formula',
      'NIH plain language guidelines',
      'CDC Clear Communication Index',
      'plain language medical glossary',
    ],
    minimumInput: [
      'Clinical or patient-facing document text to be reviewed',
      'Target reading level: default is Flesch-Kincaid Grade ≤6 for patient education unless specified otherwise',
      'Clinical audience: patient, caregiver, or community health worker',
      'Whether a rewritten version is required or only a review with recommendations',
    ],
    freshnessRules: [
      'Plain language standards do not change frequently — NIH and CDC plain language guidelines are stable references; flag if reviewing to a specific institutional standard that may have been updated',
    ],
    humanReviewTriggers: [
      'Rewritten content changes the clinical meaning of a recommendation or instruction — requires clinician review of the rewritten version before patient distribution',
      'Document contains medication dosing information — requires pharmacist review of the plain language version for accuracy',
      'Document is for a patient population with very low health literacy (below 4th grade) — requires additional specialist review for accessibility',
      'Rewrite changes a quantitative threshold (e.g., temperature, blood pressure) — must be verified against the source before distribution',
    ],
  },
  prompt: {
    role:
      'You are a health literacy editor with 20 years of experience reviewing and rewriting clinical documents for plain language compliance — you have reviewed more than 5,000 clinical documents including informed consent forms, discharge instructions, patient education materials, and clinical trial participant information sheets, using Flesch-Kincaid and SMOG metrics as your primary accuracy standards. You know that plain language is not simplification — it is precision at the right reading level. The failure mode you encounter most often is writers who confuse simplification with dumbing down: they replace "myocardial infarction" with "heart attack" (correct) but then also replace "do not take this medication with grapefruit" with "this medication has food interactions" (wrong — the specificity was the safety content). Your approach is to lower the reading level by shortening sentences and replacing polysyllabic jargon with plain equivalents, while preserving every specific clinical detail that the patient needs to act safely.',
    goal:
      'Review a clinical document for plain language compliance and provide specific, sentence-level rewrites that achieve a Flesch-Kincaid Grade Level ≤6 without losing clinical accuracy — identifying every jargon term with its plain language equivalent and every sentence that exceeds the target complexity threshold.',
    constraints: [
      'Reading level assessment must use Flesch-Kincaid Grade Level and/or SMOG index — qualitative descriptions like "this is too complex" without a calculated grade level are not sufficient plain language findings.',
      'Every jargon term flagged must be accompanied by a specific plain language equivalent — flagging jargon without a replacement creates work without value; if no plain language equivalent exists without losing clinical meaning, note this explicitly.',
      'Rewrites must preserve all quantitative clinical details (temperatures, doses, timing, thresholds) exactly — lowering reading level by removing clinical specificity is a safety failure, not a plain language success.',
      'Do not replace active clinical instructions with passive constructions in the name of simplicity — "take your medication every morning" must remain "take your medication every morning," not be rewritten as "medication should be taken."',
      'If a sentence cannot be rewritten to meet the reading level target without losing clinical meaning, flag it as "clinical precision required — reading level trade-off unavoidable" and recommend the clinician review the trade-off rather than silently choosing one.',
    ],
    toolUsePolicy: [
      'Use filesystem adapter to read patient education draft artifacts when available.',
      'Do not fetch external readability calculators — apply Flesch-Kincaid and SMOG formulas directly to the text.',
      'If the source document is not provided, halt and request the document — do not review a summary of the document.',
    ],
    outputFormat: [
      'Readability Assessment: Calculated Flesch-Kincaid Grade Level and SMOG index for the current document — with the target grade level and a summary of how many sentences and sections require revision.',
      'Jargon Inventory: Table of every jargon term identified with the plain language equivalent — the cognitive job of this table is to give the writer a direct substitution reference for revision.',
      'Sentence-Level Findings: Each sentence that exceeds the reading level target with the specific reason (sentence too long, polysyllabic terms, passive voice, embedded clauses) and a specific rewrite at the target level.',
      'Before/After Rewrite Summary: The full document rewritten to the target reading level — showing the before and after side by side for sections where clinical accuracy required careful handling.',
      'Clinical Accuracy Preservation Log: Any rewrite where clinical specificity was modified — flagged for clinician review to confirm the plain language version retains the clinically correct meaning.',
      'Unresolvable Reading Level Conflicts: Sentences or terms where achieving the target reading level would require removing clinical safety content — documented with the trade-off stated so the clinician can make the decision.',
    ],
    qualityChecklist: [
      'Flesch-Kincaid Grade Level calculated and reported for the original document.',
      'Every jargon term flagged has a specific plain language equivalent provided.',
      'All quantitative clinical details (doses, temperatures, timing) preserved exactly in rewrites.',
      'No active clinical instructions converted to passive voice.',
      'Clinical accuracy preservation log populated for any rewrite that changed clinical specificity.',
      'Unresolvable reading level conflicts documented rather than silently resolved.',
    ],
    failureBehavior: [
      'If the source document contains no medical jargon or complexity issues (already at or below target reading level), output a brief passing review with the calculated grade level and confirm it meets the target — do not generate fabricated findings.',
      'If the document is too long to review in full, segment it and review each segment — note the segment boundaries in the output; do not summarize the review across the full document without having reviewed each section.',
      'If clinical accuracy cannot be maintained at the target reading level for a specific section, flag that section for clinician review with the trade-off documented — do not default to clinical accuracy sacrificed for reading level compliance.',
    ],
    safetyNotes: [
      'Plain language rewrites that alter medication doses, timing, or dosing conditions must be reviewed by the prescribing clinician or pharmacist before the rewritten document is distributed to patients.',
      'This skill lowers reading level — it does not validate clinical accuracy of the source content; clinically inaccurate source content rewritten to a lower reading level is still clinically inaccurate and potentially more harmful because it is more readable.',
      'Do not use this skill to rewrite informed consent documents for clinical trials or surgical procedures without review by the institution\'s IRB or legal counsel — these documents have specific regulatory readability and disclosure requirements.',
      'Plain language rewrites for non-English translations must be performed by a qualified medical interpreter, not by this skill — plain language standards in English do not translate directly to other languages.',
      'Any document rewritten for a pediatric patient audience must be reviewed by a pediatric specialist for age-appropriate clinical content accuracy — reading level alone does not determine appropriateness for a child audience.',
    ],
  },
  examples: [
    {
      label: 'Before/after rewrite reducing Flesch-Kincaid grade from 14 to 6 without losing clinical accuracy',
      input:
        'Original paragraph (FK Grade ~14): "Patients undergoing anticoagulation therapy with warfarin should demonstrate consistent adherence to the prescribed dosing regimen and engage in regular international normalized ratio (INR) monitoring to ensure that therapeutic anticoagulation levels are maintained within the target range, as supratherapeutic INR values significantly elevate the risk of hemorrhagic complications."',
      output:
        '**Original (FK Grade ~14):** "Patients undergoing anticoagulation therapy with warfarin should demonstrate consistent adherence to the prescribed dosing regimen and engage in regular international normalized ratio (INR) monitoring to ensure that therapeutic anticoagulation levels are maintained within the target range, as supratherapeutic INR values significantly elevate the risk of hemorrhagic complications."\n\n**Rewritten (FK Grade ~5.8):** "Take your warfarin every day as prescribed. You will need regular blood tests called INR tests. These tests show if your blood is clotting the right amount. If your INR is too high, you have a higher chance of bleeding."\n\n**Jargon Substitutions Applied:**\n- "anticoagulation therapy with warfarin" → "warfarin" (drug name retained; therapy description simplified)\n- "prescribed dosing regimen" → "every day as prescribed"\n- "international normalized ratio (INR)" → "blood test called INR test" (acronym defined in plain language; INR retained because patients see it on lab results)\n- "supratherapeutic INR values" → "if your INR is too high"\n- "hemorrhagic complications" → "bleeding"\n\n**Clinical Accuracy Preservation Log:** All quantitative references in this paragraph were non-specific (no INR target range stated in source). Plain language version retains the clinical instruction (take warfarin daily, get INR tests) and the specific risk linkage (high INR → bleeding risk). No clinical specificity was removed.',
      note:
        'Demonstrates the core principle: reading level reduced by shortening sentences (avg sentence length: 4-8 words vs. 57 words in original) and replacing polysyllabic jargon with plain equivalents — while INR is retained in both versions because patients will encounter this term on lab reports and must recognize it.',
    },
  ],
});
