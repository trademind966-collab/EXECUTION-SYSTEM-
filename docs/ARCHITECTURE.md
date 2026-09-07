# Architecture

```
execution-system/
├── src/
│   ├── app/
│   │   ├── (auth)/login, signup          — public auth pages
│   │   ├── (dashboard)/                  — authenticated app shell
│   │   │   ├── onboarding/                 14-question guided onboarding
│   │   │   ├── goals/, goals/[goalId]/     goal CRUD, gap analysis, roadmap
│   │   │   └── layout.tsx                  nav + auth gate
│   │   ├── api/
│   │   │   ├── auth/                     signup, login, logout, verify-email,
│   │   │   │                             forgot/reset/change password, account
│   │   │   ├── onboarding/                onboarding questions + answers
│   │   │   ├── goals/                     goal CRUD
│   │   │   ├── gap-analysis/              gap analysis engine endpoint
│   │   │   ├── roadmap/                   roadmap generation + approval flow
│   │   │   ├── tasks/                     start/complete/miss + primary task
│   │   │   ├── patterns/                  repeated-failure detection + escalation
│   │   │   ├── reviews/                   weekly/30-day reviews + execution score
│   │   │   ├── reminders/                 scheduling + dispatch
│   │   │   └── question-engine/           dynamic follow-up questions
│   │   └── proxy.ts (middleware)          fast auth-gate redirect (UX only)
│   ├── components/                       ui primitives, nav, feature components
│   └── lib/
│       ├── db/                           pg pool, query/transaction helpers
│       ├── auth/                         password hashing, tokens, sessions
│       ├── permissions/                  RBAC
│       ├── validation/                   Zod schemas
│       ├── notifications/                email + reminder channel dispatch
│       ├── ai/                           OpenAI wrapper (JSON mode + graceful null)
│       └── engines/                      gap analysis, roadmap, task/dependency
│                                          engine, pattern detection, execution
│                                          score, dynamic question engine
├── supabase/migrations/                  versioned raw SQL schema
├── scripts/                              migrate, seed, bootstrap-admin
├── tests/unit/, tests/integration/       vitest
└── docs/                                 this folder
```

## Request flow: the core loop

1. **Onboarding** (`/onboarding`) — 14 fixed questions stored in
   `onboarding_answers`, including accountability style.
2. **Goal creation** (`/goals/new` → `POST /api/goals`) — stores the goal in
   `DRAFT` status with current/target state, resources, constraints, blockers.
3. **Gap analysis** (`POST /api/gap-analysis`) — `lib/engines/gapAnalysis.ts`
   investigates ten gap categories (knowledge, skill, resource, time,
   execution, consistency, strategy, information, environment,
   accountability) using AI if configured, else rule-based heuristics. Never
   assumes laziness/undiscipline — flags missing info as "needs a follow-up
   question" instead of guessing.
4. **Roadmap generation** (`POST /api/roadmap`) — `lib/engines/roadmap.ts`
   generates 15-30 extremely small (5-30 min) tasks across day 1-30, with
   explicit dependencies. Persisted as `GENERATED`, all tasks `LOCKED`.
5. **Approval** (`POST /api/roadmap/:id/approve`) — user reviews/edits first;
   only on approval do dependency-free tasks flip to `READY` and the roadmap
   becomes `ACTIVE`. AI never auto-activates a plan.
6. **Execution** (`GET /api/tasks/primary`) — the dashboard's single query:
   "what's the ONE thing to do now?" Returns the highest-priority
   READY/IN_PROGRESS task, not a list of 100.
7. **Verification** (`POST /api/tasks/:id/complete`) — user states what they
   actually did; task marked `COMPLETED`; dependents automatically unlock
   (`unlockDependents`).
8. **Missed-task flow** (`POST /api/tasks/:id/miss`) — captures a reason from
   a fixed set (task unclear, too large, no time, forgot, ...), returns a
   second-level, reason-specific follow-up question
   (`followUpQuestionFor`).
9. **Pattern detection** (`lib/engines/patternDetection.ts`) — after 3+
   misses citing the same reason, upserts a `patterns` row and surfaces a
   "we've seen this pattern" prompt rather than another generic reminder.
10. **Reviews & execution score** — weekly/30-day reviews capture what
    worked/failed/changed; `computeExecutionScore` returns
    `completed / due` with the formula, never an opaque score.
11. **Escalation** — an unresolved pattern can be escalated to a
    MANAGER/COUNSELLOR for human review (`escalations` table).

## Data model

See `supabase/migrations/0001_init.sql` for the authoritative schema:
users/sessions/tokens, onboarding_answers, goals, gap_analyses, roadmaps,
tasks (self-referential `depends_on_task_id`), missed_task_reasons,
patterns, reviews, reminders, nudge_preferences,
personal_execution_profiles, escalations, audit_logs.

## Why the dashboard shows one task, not a list

Per the product's central UX principle (spec section 66): "What is the one
thing I need to execute now?" `getPrimaryTask()` orders by
IN_PROGRESS-first, then priority, then due date, and returns a single row.
