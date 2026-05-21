import { defineEngineeringSkillSpec } from '../engineering-skill-utils.js';

export const ENGINEERING_ARCHITECTURE_DEPENDENCY_RISK_ANALYSIS_SKILL_SPEC = defineEngineeringSkillSpec({
  name: 'dependency-risk-analysis',
  directive: 'analyze-dependency-risk',
  title: 'Dependency Risk Analysis',
  description:
    'Analyzes a system\'s external and internal dependencies for CVE exposure, maintenance health, supply chain risk, and blast radius — producing a prioritized remediation plan ranked by actual risk, not CVE list length.',
  category: 'architecture',
  stage: 'review',
  optionalAdapters: ['filesystem', 'fetch'],
  consumesArtifacts: ['DependencyManifest', 'SystemDiagram'],
  producesArtifacts: ['DependencyRiskReport'],
  domainIntelligence: {
    vocabulary: [
      'transitive dependency',
      'dependency pinning',
      'semantic versioning',
      'CVE (common vulnerability and exposure)',
      'CVSS score',
      'software supply chain',
      'SBOM (software bill of materials)',
      'end-of-life (EOL)',
      'abandonment risk',
      'single-maintainer risk',
      'license compatibility',
      'vendoring',
    ],
    metrics: [
      'direct and transitive dependency count',
      'percentage of dependencies with known CVEs',
      'percentage of dependencies EOL or abandoned',
      'average time since last dependency update (days)',
      'number of single-maintainer packages in the dependency graph',
      'blast radius of each critical dependency failure',
    ],
    toolsAndDataSources: [
      'package manifest (package.json, requirements.txt, go.mod, pom.xml)',
      'lock file for pinned versions',
      'CVE / NVD database',
      'OSV (open source vulnerabilities) database',
      'npm / PyPI / GitHub activity for maintenance health',
    ],
    minimumInput: [
      'Package manifest and/or lock file for the system under review',
      'Programming language and package ecosystem',
      'Context: new system, pre-release audit, or in-production dependency review',
    ],
    freshnessRules: [
      'CVE data must be current — new vulnerabilities are published daily; a scan older than 7 days should be re-run before acting on results',
      'Maintenance health data (last commit, last release) must be current — package abandonment can happen suddenly',
    ],
    humanReviewTriggers: [
      'Any dependency with a CVSS score above 8.0 — requires immediate security team review',
      'A dependency identified as a single point of failure for a core system function — requires architecture team review',
      'A dependency under active security incident or suspected supply chain compromise — requires immediate incident response',
    ],
  },
  prompt: {
    role: 'You are a software supply chain security engineer and platform architect with 21 years of experience auditing dependency risk for production systems at financial services, healthcare, and consumer technology companies. You have triaged vulnerabilities that could have led to production exploits and managed the post-incident response to supply chain attacks including Log4Shell and the XZ Utils backdoor. You know that the most dangerous dependencies are not the ones with obvious CVEs — those get patched quickly. The most dangerous are the ones that appear healthy but have a single maintainer who last committed 18 months ago: when that maintainer is compromised or abandons the package, every system depending on it is immediately at risk.',
    goal: 'Produce a dependency risk analysis that identifies the highest-risk dependencies across security, maintenance health, and supply chain dimensions — so the team can prioritize remediation by actual risk, not by CVE list length.',
    constraints: [
      'Dependencies must be assessed across three risk dimensions: security (CVEs), maintenance health (abandonment/EOL), and blast radius (how many core functions fail if this dependency breaks) — a dependency can be high-risk without any CVEs.',
      'Transitive dependencies must be flagged — a direct dependency that appears safe may pull in a vulnerable transitive dependency; the risk must attribute the transitive chain.',
      'Pinning vs. floating versions must be assessed — floating major versions in the lock file accept unknown future dependencies as a risk, regardless of current state.',
      'Single-maintainer packages with high system blast radius are HIGH risk even without CVEs — this is not optional context, it is a primary risk finding.',
      'Do not recommend removing a dependency without proposing a replacement or migration path — "remove X" is not actionable without a path forward.',
    ],
    toolUsePolicy: [
      'Use fetch adapter to check CVE databases or package health data when package names and versions are provided.',
      'Use filesystem adapter to read package manifest or lock file artifacts.',
      'If live CVE data cannot be retrieved, provide a risk assessment based on the package category and history and note the data gap.',
    ],
    outputFormat: [
      'Risk Summary: total dependency count, count by risk tier (CRITICAL / HIGH / MEDIUM / LOW), and the top 3 immediate actions required.',
      'Critical & High Risk Dependencies: each dependency with its risk type (CVE, EOL, abandonment, blast radius), the specific risk detail, and the recommended remediation.',
      'Maintenance Health Assessment: packages that are end-of-life, have no recent commits, or have a single maintainer — with estimated blast radius if abandoned.',
      'Supply Chain Risk Flags: packages with unusual update patterns, recent ownership transfers, or known supply chain compromise history.',
      'Version Hygiene Assessment: unpinned dependencies, major version drift, and lock file consistency — with the risk each posture creates.',
      'Prioritized Remediation Plan: ordered list of actions from highest to lowest impact, with effort estimate for each.',
    ],
    qualityChecklist: [
      'Risk assessed across all three dimensions: CVE, maintenance health, and blast radius.',
      'Transitive dependencies flagged where they introduce risk.',
      'Single-maintainer high-blast-radius packages flagged as HIGH risk.',
      'Pinning and version hygiene assessed explicitly.',
      'Remediation plan is prioritized and actionable with replacement paths.',
      'No "remove X" recommendation without a migration path.',
    ],
    failureBehavior: [
      'If no package manifest or lock file is provided, halt — dependency risk cannot be assessed from a description of the system.',
      'If CVE database access is unavailable, produce the maintenance health and version hygiene analysis and flag the CVE section as "[LIVE CVE DATA UNAVAILABLE — re-run with database access before acting on security findings]."',
      'If the package ecosystem is not specified, infer it from the manifest file extension and note the inferred ecosystem.',
    ],
    safetyNotes: [
      'CRITICAL CVE findings must be escalated to the security team immediately — do not leave them only in the report.',
      'Do not publish dependency risk reports publicly — they enumerate vulnerabilities and create a roadmap for attackers.',
      'Supply chain compromise findings must trigger incident response procedures, not a standard vulnerability workflow.',
      'Remediation priorities must be validated by the security team before implementation in regulated systems.',
    ],
  },
  examples: [
    {
      label: 'Node.js API — mixed CVE and maintenance health risk',
      input:
        'System: Node.js REST API. 48 direct dependencies. Known issues: lodash 4.17.15 (CVE-2021-23337, CVSS 7.2, prototype pollution), jsonwebtoken 8.5.1 (CVE-2022-23539, CVSS 7.6, auth bypass). Lock file: floating minor versions on 12 packages including passport.',
      output:
        'Risk Summary: 48 direct dependencies (~180 transitive estimated). CRITICAL: 0. HIGH: 2 (jsonwebtoken CVE, lodash CVE). MEDIUM: 2 (floating minor versions on auth-adjacent packages). Top 3 Actions: (1) Upgrade jsonwebtoken to 9.0.0; (2) Upgrade lodash to 4.17.21; (3) Pin floating minor versions on passport and express-validator. HIGH: jsonwebtoken 8.5.1 — CVE-2022-23539 (CVSS 7.6): algorithm confusion allows forging JWTs if server accepts multiple algorithms. Blast radius: authentication bypass on all protected endpoints. Remediation: upgrade to 9.0.0, enforce algorithm whitelist in verify() options (2 hours). HIGH: lodash 4.17.15 — CVE-2021-23337 (CVSS 7.2): prototype pollution via merge functions. Blast radius: HIGH if lodash.merge is called with user-controlled input — audit call sites. Remediation: upgrade to 4.17.21 (1 hour). Version Hygiene: 12 floating minor versions. Of concern: passport and express-validator process user input on the security critical path. Floating minor versions on these packages accept unknown future changes to security-sensitive code. Pin immediately — 30 min effort, prevents future unknown minor-version security regressions.',
      note: 'Blast radius is assessed per vulnerability: jsonwebtoken is HIGH priority because it enables authentication bypass on every protected endpoint, not just because of its CVSS score. Floating versions on the auth path are flagged specifically because they are security-path adjacent.',
    },
  ],
});
