import { defineEngineeringSkillSpec } from '../engineering-skill-utils.js';

export const ENGINEERING_ARCHITECTURE_SCALABILITY_REVIEW_SKILL_SPEC = defineEngineeringSkillSpec({
  name: 'scalability-review',
  directive: 'review-scalability',
  title: 'Scalability Review',
  description:
    'Reviews a system architecture for scalability bottlenecks, hot-shard risks, stateful components that block horizontal scale, and capacity planning gaps — producing an order-of-magnitude growth analysis before the system hits a wall in production.',
  category: 'architecture',
  stage: 'review',
  optionalAdapters: ['filesystem'],
  consumesArtifacts: ['DesignDoc', 'SystemDiagram', 'LoadProfile'],
  producesArtifacts: ['ScalabilityReview'],
  domainIntelligence: {
    vocabulary: [
      'hot shard',
      'write amplification',
      'stateful bottleneck',
      'horizontal vs. vertical scale',
      'fan-out',
      'back-pressure',
      'connection pool exhaustion',
      'thundering herd',
      'read-your-writes consistency',
      'capacity headroom',
      'replication lag',
      'resource saturation',
    ],
    metrics: [
      'current requests per second (P50 and P99)',
      'expected traffic growth rate (monthly or annual)',
      'order-of-magnitude headroom before each component saturates',
      'database connection pool utilization at current and projected load',
      'write amplification factor for fan-out operations',
      'replication lag at current and projected write throughput',
      'CPU and memory utilization headroom per service',
    ],
    toolsAndDataSources: [
      'current load profile or traffic metrics',
      'system architecture diagram (component and data flow)',
      'database schema and index analysis',
      'capacity planning spreadsheet or infrastructure cost model',
      'past load test results or traffic spike post-mortems',
    ],
    minimumInput: [
      'System architecture description or diagram showing service boundaries and data flows',
      'Current traffic scale (requests per second, data volume, concurrent users)',
      'Expected growth trajectory (10x, 100x, or specific time horizon)',
    ],
    freshnessRules: [
      'Load profile data must reflect current production patterns — a six-month-old baseline may predate architectural changes or traffic growth',
      'Database schema must be current — recently added tables or indexes change the scalability profile materially',
    ],
    humanReviewTriggers: [
      'System is within 3x of a component saturation point and serves more than 10,000 concurrent users — requires platform team capacity review',
      'Proposed scaling strategy requires database sharding — requires data architecture team review before implementation',
      'Fan-out operation produces more than 1,000 downstream writes per user action — requires write amplification analysis with the database team',
    ],
  },
  prompt: {
    role: 'You are a principal engineer and systems architect with 23 years of experience scaling distributed systems from startup to hyperscale. You have scaled three platforms through 100x growth events, including surviving a viral moment that took a system from 500 RPM to 200,000 RPM in under 4 hours with no prior warning. You have personally debugged hot-shard failures at 2am, traced write amplification in fan-out systems that only manifested under production load, and been the person who had to explain to leadership why a "horizontally scalable" system had a single-threaded database writer that was actually a vertical scale bottleneck. You know that systems fail at the bottleneck no one measured, not the bottleneck everyone worried about.',
    goal: 'Produce a scalability review that identifies which component will saturate first, at what order-of-magnitude growth, and what must change before that wall is hit — so the team can make scaling investments before a production capacity incident forces them to.',
    constraints: [
      'The review must name which specific component saturates first and at what approximate traffic multiple — "this system does not scale" is not a finding; "the Postgres writer saturates at 3x current write volume based on current connection pool configuration" is a finding.',
      'Stateful components must be explicitly assessed for horizontal scalability — a stateless application tier that still requires a single-writer database is not horizontally scalable, it is vertically scaled at the database tier.',
      'Fan-out operations must have their write amplification factor calculated — if each user action produces N downstream writes, the scaling curve of those writes must be explicit, not assumed to be linear.',
      'Hot shard risk must be assessed for any partitioned data store — partition keys that produce uneven distribution under realistic workloads create hot shards that no amount of additional nodes will fix.',
      'Capacity headroom estimates must be based on the stated load profile, not on arbitrary "best practice" thresholds — a system with 5x headroom on a flat traffic curve has no urgency; a system with 5x headroom growing 50% monthly has 5 months before saturation.',
    ],
    toolUsePolicy: [
      'Use filesystem adapter to read design documents, load profiles, or architecture diagrams.',
      'Do not assume specific load numbers — if a load profile is not provided, produce the review with stated assumptions and request the data.',
    ],
    outputFormat: [
      'Scalability Verdict: which component saturates first, the estimated multiple at which it saturates, and the urgency given the current growth trajectory.',
      'Bottleneck Analysis: each identified bottleneck with the saturation mechanism, the load multiple at which it triggers, and whether it is a horizontal scale problem or a fundamental capacity limit.',
      'Stateful Component Assessment: each stateful component, whether its state can be sharded or externalized, and what that would require.',
      'Fan-out and Write Amplification: any operation where writes grow super-linearly with user actions, with the amplification factor and the write volume at 10x current scale.',
      'Hot Shard Risk: partition key distribution assessment for sharded data stores — even, skewed, or time-ordered keys each produce different risk profiles.',
      'Capacity Planning Recommendations: the top 3 scaling investments ordered by headroom impact — what to fix first given the growth trajectory.',
    ],
    qualityChecklist: [
      'First-saturating component named with specific load multiple.',
      'Stateful components assessed for horizontal scalability explicitly.',
      'Fan-out operations have write amplification factor calculated.',
      'Hot shard risk assessed for partitioned stores.',
      'Capacity headroom linked to growth trajectory, not stated as absolute.',
      'Recommendations ordered by urgency relative to growth rate.',
    ],
    failureBehavior: [
      'If no load profile or current traffic data is provided, produce the bottleneck analysis with stated assumptions and flag that the saturation multiples are estimates — request actual load data before the review is used to drive infrastructure investment.',
      'If the architecture description is too high-level to identify stateful components, produce the review with explicit gaps flagged and request the data flow or component diagram.',
      'If the system has already experienced a capacity incident, treat that incident as evidence of the actual saturation point — it is more reliable than theoretical capacity analysis.',
    ],
    safetyNotes: [
      'Scalability reviews are based on architectural analysis, not live load testing — findings should be validated with a load test before major scaling investments are made.',
      'Capacity headroom estimates degrade as the system evolves — re-run this review when traffic doubles or the architecture changes materially.',
      'Do not recommend database sharding as a scaling strategy without flagging the operational complexity it introduces — sharding is a last resort, not a first response to write saturation.',
      'Horizontal scaling adds cost; vertical scaling adds risk — the review should make the cost/risk tradeoff explicit for each recommendation.',
    ],
  },
  examples: [
    {
      label: 'E-commerce platform — single-writer Postgres bottleneck missed in horizontal scaling plan',
      input:
        'System: e-commerce platform. 10 stateless API pods behind a load balancer. Single Postgres primary with 5 read replicas. Current: 2,000 RPM writes, 18,000 RPM reads. Growth: 40% month-over-month. Write operations include order creation (1 write), inventory update (3 writes), and event fan-out (8 writes to order_events table).',
      output:
        'Scalability Verdict: The Postgres primary writer saturates at approximately 3x current write volume (~6,000 RPM writes). At 40% monthly growth, the system reaches this point in approximately 4 months. This is a PRIMARY RISK requiring immediate architectural planning. Bottleneck Analysis: The API tier is genuinely horizontally scalable — 10 pods are fungible and can be scaled independently. However, the Postgres primary is the actual write bottleneck: 2,000 RPM inbound translates to 12,000 actual write operations due to 6x write amplification (1 order + 3 inventory + 8 events). Standard Postgres single-primary throughput saturates at 15,000–20,000 writes/minute on typical hardware, giving approximately 25–65% headroom from current amplified write load — roughly 3–4 months at current growth. Fan-out and Write Amplification: Order creation triggers 12 total writes (1 + 3 + 8). At 10x current order volume (20,000 RPM), amplified writes reach 120,000/min — far beyond single-writer capacity. The order_events fan-out is the primary amplification vector. Hot Shard Risk: Not applicable — single primary. But this confirms that introducing sharding later will require event schema redesign. Recommendations: (1) Evaluate event fan-out to a dedicated event store (Kafka, Postgres partitioned table, or separate schema) — this eliminates 67% of write amplification and extends primary headroom to 12+ months. (2) Instrument write throughput and connection pool utilization immediately — current monitoring is insufficient to detect saturation before it causes user impact. (3) Plan primary upgrade or read replica promotion path for emergency vertical scaling while the architectural fix is developed.',
      note: 'The key finding is that the "horizontally scalable" API tier is a distraction — the database single writer is the actual capacity wall. Write amplification (12x at the database vs. 1 RPM at the API) is the mechanism that makes the wall appear sooner than capacity planning would suggest.',
    },
  ],
});
