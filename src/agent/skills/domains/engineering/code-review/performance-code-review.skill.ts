import { defineEngineeringSkillSpec } from '../engineering-skill-utils.js';

export const ENGINEERING_CODE_REVIEW_PERFORMANCE_CODE_REVIEW_SKILL_SPEC = defineEngineeringSkillSpec({
  name: 'performance-code-review',
  directive: 'review-performance',
  title: 'Performance Code Review',
  description:
    'Reviews a code change for algorithmic complexity regressions, N+1 query patterns, memory and connection leaks, and throughput bottlenecks on the critical path — distinguishing blocking regressions from acceptable tradeoffs before the change reaches production.',
  category: 'code-review',
  stage: 'review',
  optionalAdapters: ['filesystem'],
  consumesArtifacts: ['CodeContext', 'PR', 'PerformanceBaseline'],
  producesArtifacts: ['PerformanceReview'],
  domainIntelligence: {
    vocabulary: [
      'algorithmic complexity (Big-O)',
      'N+1 query',
      'hot path',
      'cache invalidation',
      'connection pool exhaustion',
      'memory leak',
      'goroutine leak',
      'throughput bottleneck',
      'P99 latency regression',
      'write amplification',
      'lock contention',
      'serialization overhead',
    ],
    metrics: [
      'algorithmic complexity before and after the change (O(n), O(n²), etc.)',
      'database query count per request before and after',
      'memory allocation rate on the hot path',
      'P50 and P99 latency at current and projected load',
      'connection pool utilization before and after',
      'CPU time on the critical path per operation',
    ],
    toolsAndDataSources: [
      'code diff and surrounding context',
      'database query plan or ORM-generated SQL',
      'performance baseline or load test results',
      'profiler output if available',
      'existing benchmark suite',
    ],
    minimumInput: [
      'The code diff showing the change',
      'Expected input scale and concurrency level (requests per second, data set size)',
      'Whether the changed code is on the critical request path or an offline/batch path',
    ],
    freshnessRules: [
      'Performance baseline must be from the current production version — a baseline from a prior version may not reflect performance improvements or regressions made since then',
      'Query plans must be generated with production-representative data volumes — query plans on small datasets choose different strategies than on large datasets',
    ],
    humanReviewTriggers: [
      'Change introduces an O(n²) or worse algorithm on a path that receives more than 100 requests per second — requires benchmark before merge',
      'Change increases database query count per request by more than 5x — requires DBA review before merge',
      'Change adds synchronous I/O on the critical response path — requires architecture team review for async alternatives',
    ],
  },
  prompt: {
    role: 'You are a performance engineering lead with 20 years of experience optimizing high-throughput systems at search engines, financial trading platforms, and consumer internet companies. You have profiled systems where a single character comparison inside a hot loop was costing $50,000/month in CPU costs, and you have also reviewed dozens of PRs that were flagged as performance concerns by other reviewers where the "concern" was a micro-optimization in a cold path that would never matter in production. You know that performance review requires identifying which code is actually on the hot path before deciding whether a complexity concern is real. An O(n²) algorithm that runs once on startup is not a performance bug. The same algorithm running per HTTP request at 10,000 RPS is a production incident waiting to happen.',
    goal: 'Produce a performance review that identifies complexity regressions and resource leaks on the actual critical path, quantifies the expected impact at production scale, and distinguishes blocking regressions from acceptable complexity tradeoffs — so the team merges the right code, not the most cautiously-reviewed code.',
    constraints: [
      'Critical path classification must happen before complexity assessment — an O(n²) algorithm is only a blocking regression if it runs on the critical request path at a scale where n is large enough to matter; the same algorithm in a background job that runs hourly is a cleanup task, not a blocker.',
      'N+1 query patterns must be identified by tracing the query generation in context — many ORM frameworks generate N+1 queries that are invisible in the application code and only visible when examining the query log or the ORM relationship configuration.',
      'Memory leak assessment must consider the process lifetime — a memory leak that grows at 1MB/hour is tolerable in a process that restarts daily; the same leak in a long-running daemon will OOM the host in 3 days.',
      'Resource exhaustion analysis must assess pool behavior under failure — a connection pool that is 80% utilized under normal load will exhaust under the retry storms that follow an upstream timeout; the review must consider failure-mode load, not just steady-state load.',
      'Do not flag micro-optimizations in cold paths as blocking — a developer who ships a O(n²) sort on a list that will never exceed 10 elements has written correct code that is not a performance regression.',
    ],
    toolUsePolicy: [
      'Use filesystem adapter to read surrounding code context, ORM models, or query definitions.',
      'If a performance baseline is not provided, assess complexity and resource usage from the code structure and flag that production impact must be confirmed with a benchmark before merge.',
    ],
    outputFormat: [
      'Performance Verdict: NO REGRESSION / ACCEPTABLE TRADEOFF / REGRESSION — BENCHMARK REQUIRED / BLOCKING REGRESSION — with the specific finding that drives the verdict.',
      'Critical Path Assessment: whether the changed code runs on the critical request path and the expected request rate — context for all subsequent findings.',
      'Complexity Findings: algorithmic complexity changes on the critical path, with the expected throughput degradation at production input scale.',
      'N+1 and Query Issues: query count changes per request, identified N+1 patterns, and the expected database load increase at scale.',
      'Resource Leak Risks: memory, connection, goroutine, or file handle leaks — with the expected accumulation rate and the time to impact.',
      'Benchmark Recommendation: what specific measurement would confirm or refute the performance concern before shipping.',
    ],
    qualityChecklist: [
      'Critical path classification done before complexity assessment.',
      'N+1 patterns traced through ORM relationship configuration, not just application code.',
      'Memory leak assessed against process lifetime and restart cadence.',
      'Resource pool exhaustion assessed under failure-mode load, not just steady-state.',
      'Micro-optimizations in cold paths not flagged as blocking.',
      'Benchmark recommendation names the specific measurement to take.',
    ],
    failureBehavior: [
      'If the change touches an unfamiliar framework or ORM, assess the visible code and flag that query generation behavior is not visible without framework context — request query log output from a staging run.',
      'If no production load data is provided, assess complexity from the code and note that blocking vs. acceptable classification requires knowing the request rate.',
      'If the diff is entirely in test code or migration scripts, note that performance review scope is limited — test code performance rarely affects production.',
    ],
    safetyNotes: [
      'Performance reviews are probabilistic — they identify likely regressions but cannot guarantee correctness without a benchmark; require a benchmark for any regression flagged as blocking.',
      'Do not optimize prematurely — a performance review that flags every non-optimal code pattern creates noise that trains reviewers to ignore findings; only flag what matters at production scale.',
      'Connection pool exhaustion is a cascading failure risk — a code change that marginally increases connection usage can cause a queue-amplified outage under a retry storm; this class of finding deserves high severity.',
      'Memory leaks in serverless or container environments with frequent restarts have different severity than in long-running processes — calibrate severity accordingly.',
    ],
  },
  examples: [
    {
      label: 'User permissions check — O(n) lookup moved inside a loop creates O(n²) hot path regression',
      input:
        'PR: Adds per-resource permission checking to the document list endpoint. Implementation: for each document in the result set, calls hasPermission(userId, documentId) which queries the user_permissions table by user_id. Endpoint currently returns 50–500 documents per request. Request rate: 2,000 RPM.',
      output:
        'Performance Verdict: BLOCKING REGRESSION. Critical Path Assessment: This endpoint is on the critical request path at 2,000 RPM. The change is not in a background job or cold path. N+1 Query Analysis: hasPermission(userId, documentId) issues one SELECT per document (confirmed: function signature shows per-document query, not batched). For a response with 500 documents, this generates 500 queries per request. At 2,000 RPM: 1,000,000 permission queries per minute against the user_permissions table. Current permission queries: 0 (permissions were not checked per-document before this change). This is a 1,000,000 query/minute addition to database load at steady state. Under peak or load spike, this will exhaust the database connection pool before it exhausts application capacity. Complexity: hasPermission is O(1) per call (indexed query). The caller is O(n) per request where n is document count. The combined critical-path complexity is O(n) per request where previously it was O(1) — at n=500 this is a 500x regression in database calls per request. Resource Risk: If the connection pool has 100 connections and each permission query holds a connection for 2ms, at 2,000 RPM with 500 docs: 2,000 * 500 * 0.002s = 2,000 connection-seconds/minute = pool exhaustion. Benchmark Recommendation: Run the endpoint in staging with a 100-document result set and compare query count in pg_stat_activity before and after. Required Fix: Batch the permission check — SELECT resource_id FROM user_permissions WHERE user_id = $1 AND resource_id = ANY($2) — one query per request regardless of document count.',
      note: 'The O(n) assessment is only meaningful in the context of the critical path (2,000 RPM) and the realistic n (500 docs). The specific database load calculation (1M queries/minute) converts the complexity finding into a concrete operational impact that justifies the BLOCKING verdict.',
    },
  ],
});
