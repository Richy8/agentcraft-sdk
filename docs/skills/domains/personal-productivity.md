# Personal Productivity Domain Skills

The personal-productivity domain provides 16 skills for planning, task management, scheduling, communication, and personal decision-making. Use them to build personal assistant agents, weekly planning tools, email drafters, and life admin helpers.

## Quick Start

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { createSkillPackByName } from "@deskcreate/agentcraft/skills";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  skillActivation: "auto",
}).use(createSkillPackByName("personal-productivity"));

const response = await agent.run({
  prompt: "/write-weekly-plan Write a weekly plan for a product manager with 3 key deliverables, 12 meetings, and a goal to ship a PRD by Friday.",
});
console.log(response.content);
```

## Skills

### Planning & Scheduling

| Skill | Directive | Purpose |
| --- | --- | --- |
| `weekly-plan-writer` | `/write-weekly-plan` | Realistic weekly plan mapping focus work, admin, and recovery time |
| `time-blocking-plan` | `/plan-time-blocks` | Time-blocked schedule protecting focus, admin, and break time |
| `calendar-audit` | `/audit-calendar` | Audit a calendar for capacity overload and hidden cost |
| `schedule-conflict-resolution` | `/resolve-conflict` | Resolve scheduling conflicts by identifying hard constraints |
| `meeting-prep-brief` | `/prepare-meeting` | Meeting brief with purpose, desired decision, and attendee context |

### Task Management

| Skill | Directive | Purpose |
| --- | --- | --- |
| `task-prioritization` | `/prioritize-tasks` | Prioritize a task inventory by consequence, deadline, and energy |
| `personal-backlog-triage` | `/triage-backlog` | Triage a messy personal backlog into active commitments and parking lot |
| `life-admin-checklist` | `/build-checklist` | Build a sequenced checklist for personal admin tasks |
| `home-project-plan` | `/plan-home-project` | Plan a home project by scope, budget, dependencies, and vendors |
| `travel-prep-checklist` | `/prepare-travel` | Create a travel preparation checklist sequencing documents and tasks |

### Communication

| Skill | Directive | Purpose |
| --- | --- | --- |
| `personal-email-draft` | `/draft-personal-email` | Draft personal email that is clear, specific, and appropriately toned |
| `followup-message-writer` | `/write-followup` | Write a follow-up message naming prior context and next action |
| `difficult-conversation-planner` | `/plan-conversation` | Plan a difficult conversation separating facts, intent, and outcome |

### Decision & Reflection

| Skill | Directive | Purpose |
| --- | --- | --- |
| `task-prioritization` | `/prioritize-tasks` | Prioritize tasks by consequence, deadlines, and effort |
| `decision-journal-entry` | `/journal-decision` | Create a decision journal entry with options, reasoning, and expected outcomes |
| `habit-review` | `/review-habit` | Review a habit attempt by trigger, friction, reward, and calendar fit |
| `personal-document-summary` | `/summarize-document` | Summarize a personal document into purpose, key dates, and action items |

## Patterns

### Weekly Planning Assistant

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { createSkillPackByName } from "@deskcreate/agentcraft/skills";
import { GoogleCalendarAdapter } from "@deskcreate/agentcraft/adapters";

const assistant = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  skillActivation: "directive-only",
})
  .use(createSkillPackByName("personal-productivity"))
  .use(GoogleCalendarAdapter.connect({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN!,
  }));

// Audit current calendar
const calendarAudit = await assistant.run({
  prompt: `/audit-calendar Audit my calendar for next week.
  Context: 14 meetings scheduled, 3 deep work sessions needed, PRD due Friday.`,
});

// Resolve any conflicts
const conflictResolution = await assistant.run({
  prompt: `/resolve-conflict Resolve the scheduling conflicts in this audit.
  
  Audit: ${calendarAudit.content}`,
});

// Write the week plan
const weekPlan = await assistant.run({
  prompt: `/write-weekly-plan Write my weekly plan incorporating these calendar changes.
  
  Conflicts resolved: ${conflictResolution.content}
  Top 3 priorities: Ship PRD draft, stakeholder review meeting, Q3 roadmap update.`,
});
```

### Backlog Triage + Prioritization

```ts
const agent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
  skillActivation: "auto",
}).use(createSkillPackByName("personal-productivity"));

const rawBacklog = `
- Respond to contractor invoice dispute
- Review Q3 budget proposal (needed by Thursday)
- Call dentist re: appointment
- Finish slides for board presentation (Friday)
- Update home insurance policy
- Read "The Lean Startup" (personal)
- Fix leaking kitchen faucet
`;

const triaged = await agent.run({
  prompt: `/triage-backlog Triage this personal backlog.
  
  ${rawBacklog}`,
});

const prioritized = await agent.run({
  prompt: `/prioritize-tasks Prioritize the active commitments from this triage.
  
  Triaged: ${triaged.content}`,
});
```

### Decision Journaling

```ts
const decisionEntry = await agent.run({
  prompt: `/journal-decision Document this decision:
  
  Decision: Accept a new job offer at a startup vs. stay at current role.
  Options:
  - Startup: 30% pay cut, equity, exciting mission, uncertain runway
  - Current: stable, good pay, limited growth trajectory
  Deadline: By end of week`,
});
```

## Optional Adapters

| Adapter | Benefit |
| --- | --- |
| `GoogleCalendarAdapter` | Read and create calendar events for planning skills |
| `EmailAdapter` | Draft and send follow-up emails directly |
| `FileSystemAdapter` | Load personal documents, checklists, and project notes |

## Related

- [Industry Domain Skills Overview](./overview.md)
- [Product Domain](./product.md)
- [Support Domain](./support.md)
