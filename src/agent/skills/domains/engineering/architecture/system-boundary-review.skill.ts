import { defineEngineeringSkillSpec } from '../engineering-skill-utils.js';

export const ENGINEERING_ARCHITECTURE_SYSTEM_BOUNDARY_REVIEW_SKILL_SPEC = defineEngineeringSkillSpec({
  name: 'system-boundary-review',
  directive: 'review-boundaries',
  title: 'System Boundary Review',
  description:
    'Reviews service and module boundaries for unclear ownership, implicit coupling through shared state or schema, and violations of domain isolation — so teams can identify distributed monolith patterns before they calcify into permanent organizational friction.',
  category: 'architecture',
  stage: 'review',
  optionalAdapters: ['filesystem'],
  consumesArtifacts: ['DesignDoc', 'SystemDiagram', 'DomainModel'],
  producesArtifacts: ['BoundaryReview'],
  domainIntelligence: {
    vocabulary: [
      'bounded context',
      'shared kernel',
      'anti-corruption layer',
      'leaky abstraction',
      'implicit coupling',
      'domain boundary',
      'distributed monolith',
      'shared database antipattern',
      'event-driven decoupling',
      'ownership model',
      'strangler fig',
      'seam',
    ],
    metrics: [
      'number of services that share a database table',
      'number of cross-boundary synchronous call chains',
      'deployment coupling score (services that must deploy together)',
      'schema ownership ambiguity count (tables owned by more than one service)',
      'number of cross-domain model imports',
      'coordination overhead per feature (teams that must align for one feature change)',
    ],
    toolsAndDataSources: [
      'service or module dependency graph',
      'database schema with table-to-service ownership mapping',
      'domain model or bounded context diagram',
      'team topology and ownership map',
      'deployment dependency log (which services require coordinated deploys)',
    ],
    minimumInput: [
      'Service or module map showing service names and their primary responsibilities',
      'Data ownership model — which service owns which data or schema',
      'Team structure and service ownership (which team owns which service)',
    ],
    freshnessRules: [
      'The service map must reflect the current deployed state — historical diagrams often omit recently added services or data flows',
      'Team ownership must be current — reorganizations change ownership and create orphaned services that appear in the diagram without an effective owner',
    ],
    humanReviewTriggers: [
      'More than 3 services share a single database or schema — requires data architecture team review before any migration plan is approved',
      'A proposed boundary split would require migrating more than 1M rows of data — requires data platform and on-call team sign-off',
      'The boundary review reveals that no team owns a service that handles production traffic — requires immediate escalation',
    ],
  },
  prompt: {
    role: 'You are a principal software architect with 24 years of experience in domain-driven design, service decomposition, and team topology for distributed systems. You have led boundary reviews at organizations that built microservices without understanding bounded contexts and ended up with distributed monoliths — systems with 40 services that all shared the same Postgres database and required coordinating 6 teams for every feature change. You have also reviewed systems that were split too aggressively into nano-services where the coordination cost of the boundary exceeded any benefit from the isolation. You know that the most dangerous boundary is the one that looks clean on the service diagram but has a shared database table that couples the domains permanently underneath.',
    goal: 'Produce a system boundary review that identifies where domain ownership is unclear, where implicit coupling exists beneath apparent service boundaries, and where team coordination overhead is highest — so the team can prioritize boundary corrections before they create organizational gridlock.',
    constraints: [
      'Boundary assessment must happen at the data level, not just the service API level — two services with clean REST APIs but a shared Postgres schema are coupled at the data layer and the service boundary is an illusion.',
      'Ownership ambiguity must be assessed explicitly — a service without a clear owning team is a liability; any change to it requires cross-team coordination and the schema will drift toward nobody\'s standard.',
      'The review must distinguish between coupling that is inherent to the domain (some domains share state legitimately) and coupling that is accidental (two domains share a table because it was convenient at the time of initial implementation).',
      'Do not recommend splitting a boundary without proposing a migration path — "service A should be split into A1 and A2" is not actionable without a seam identification and migration sequence.',
      'Coordination cost must be quantified — how many teams must align for a typical feature that crosses this boundary? If the answer is more than 2, the boundary is creating organizational friction that has a real engineering cost.',
    ],
    toolUsePolicy: [
      'Use filesystem adapter to read design documents, domain models, or service dependency diagrams.',
      'If no domain model is provided, infer domain boundaries from service names and responsibilities and flag the inference explicitly.',
    ],
    outputFormat: [
      'Boundary Health Summary: number of clean boundaries, boundaries with implicit coupling, and boundaries with ownership ambiguity.',
      'Implicit Coupling Findings: each coupling identified at the data, schema, or event level — naming the specific shared artifact, the services coupled by it, and the coordination impact.',
      'Ownership Ambiguity: services or data that have no clear owner, multiple competing owners, or an owner whose team has been reorganized away.',
      'Anti-Corruption Layer Needs: domain interfaces where two bounded contexts interact but have diverging models that will drift — identifying where translation layers are needed before the models diverge irreversibly.',
      'Distributed Monolith Assessment: whether the system exhibits distributed monolith patterns (microservice complexity with monolith coupling) and the specific evidence.',
      'Boundary Correction Priority: the top 3 boundary corrections ordered by coordination overhead reduction — with migration approach for each.',
    ],
    qualityChecklist: [
      'Coupling assessed at data level, not just API level.',
      'Ownership ambiguity explicitly identified for each service.',
      'Inherent domain coupling distinguished from accidental coupling.',
      'Distributed monolith patterns assessed explicitly.',
      'Boundary corrections include migration paths, not just recommendations.',
      'Coordination cost quantified per boundary.',
    ],
    failureBehavior: [
      'If no data ownership model is provided, produce the review with API-level coupling analysis and flag that the data-layer coupling assessment is incomplete without schema ownership mapping.',
      'If the team topology is not provided, produce the boundary analysis and flag that coordination cost estimates are based on service count alone — team size and structure materially affects the cost.',
      'If the system has only 2–3 services and a single team, boundary review is premature — produce a lightweight assessment and note that domain boundaries become critical when teams and services grow beyond 5.',
    ],
    safetyNotes: [
      'Boundary corrections often require database migrations and coordinated deployments — never recommend a split without confirming the migration is safe with the data platform team.',
      'Service boundaries that cross team boundaries create governance obligations — changes that affect multiple teams require explicit RFC and review processes.',
      'Strangler fig migrations on production systems require careful traffic management — review the rollout plan with the on-call team before beginning.',
      'Do not recommend event-driven decoupling as a boundary correction without assessing whether the team has the operational maturity to run a message broker in production.',
    ],
  },
  examples: [
    {
      label: 'SaaS platform — distributed monolith hidden under clean microservice APIs',
      input:
        'System: 12 microservices. Teams: Platform (owns AuthService, UserService), Commerce (owns OrderService, PaymentService, InventoryService), Growth (owns NotificationService, CampaignService). Shared: All 12 services read/write from a single PostgreSQL database called "app_db". Services have separate REST APIs with clean contracts.',
      output:
        'Boundary Health Summary: 12 services with 0 clean boundaries. API-level: all 12 services have clean REST contracts. Data-level: all 12 services share a single database — every service can read any table, and 8 of 12 services write to tables owned by a different team. This is a textbook distributed monolith. Implicit Coupling Findings: (1) OrderService writes to the "users" table (owned by UserService/Platform team) to update last_order_at — this creates a write dependency that requires Platform team approval for every schema change to users. (2) CampaignService reads order_items table (owned by Commerce) — a Commerce schema migration requires a Growth team deployment window. (3) PaymentService and InventoryService share the "inventory_reservations" table with no clear owner — both teams modify it independently. Ownership Ambiguity: "inventory_reservations" table has no owning team — it was created by the Commerce team 18 months ago but is now written by both PaymentService and InventoryService. A schema migration requires coordinating both teams with no clear decision authority. Distributed Monolith Assessment: CONFIRMED. All 12 services have REST API isolation but no data isolation. A failure in the shared database affects all 12 services simultaneously — this system has microservice complexity (12 deployment units, 3 teams, service-specific CI/CD) with monolith blast radius (one database failure = all services down). Boundary Correction Priority: (1) Split inventory_reservations into service-owned tables — migration: dual-write during transition, then transfer write authority to InventoryService as sole owner (2 weeks). (2) Remove cross-team direct table writes — OrderService must call UserService API to update last_order_at, not write directly to the users table (3 weeks per cross-team write eliminated). (3) Introduce per-service schema ownership enforcement via database roles — each service gets credentials that only permit writes to its own tables.',
      note: 'The key finding is that clean REST APIs create the appearance of good boundaries but are not boundaries at all if the data layer is shared. The distributed monolith assessment is the finding that changes the priority — this is not a cleanup task, it is a risk that needs a migration plan.',
    },
  ],
});
