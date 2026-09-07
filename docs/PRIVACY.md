# Privacy

## What we collect

| Category | Examples | Required? |
|---|---|---|
| Account data | email, password hash, full name | Required |
| Onboarding answers | big goal, why, blockers, available time, etc. | Required (to use the product) |
| Goal & task data | goal fields, task titles/descriptions, verification notes | Required (core product) |
| AI-generated data | gap analyses, generated roadmaps/tasks, follow-up questions | Generated, not user-entered |
| Analytics/pattern data | execution rate, personal execution profile, detected patterns | Derived, optional to act on |
| Communication preferences | accountability style, nudge on/off per type, reminder channel | Optional |

We do not collect anything beyond what's needed to run the execution loop
described in the product spec — no third-party tracking pixels, no ad
identifiers, no data sale.

## User rights (implemented)

- **View stored data** — every entity (goals, tasks, reviews, onboarding
  answers) is queryable by its owner via the existing API routes.
- **Export data** — `GET` routes return JSON for goals/tasks/reviews per
  user; wiring these into a single "export everything" zip is a
  straightforward addition (see docs/ROADMAP.md) but the underlying
  per-resource endpoints already exist.
- **Delete account** — `DELETE /api/auth/account` anonymizes personally
  identifying fields (email, name, password hash) and marks the account
  `DELETED`. We anonymize rather than hard-delete the row so that goals,
  tasks, and reviews the user created remain internally consistent (foreign
  keys), without retaining anything that identifies the person.
- **Deactivate (reversible)** — `PATCH /api/auth/account` sets status to
  `DEACTIVATED` without touching any data, for a "leave and maybe come back"
  path distinct from permanent deletion.

## AI processing consent

Before any AI-assisted feature (gap analysis, roadmap generation, question
engine) is used, the product shows:

> "Your answers may be processed by AI to generate questions, roadmaps and
> execution guidance."

`users.ai_consent_at` records when a user acknowledged this. AI-assisted
engines all have a deterministic non-AI fallback, so a user can decline AI
processing and still use the full product (see docs/DECISIONS.md).

## Data minimization

- Optional fields (risks, constraints, resources, etc.) are genuinely
  optional at the database level (nullable columns) — nothing forces a user
  to overshare to use the core loop.
- Seed/development data (`scripts/seed.ts`) uses only fictional
  `@dev.local` accounts — never real personal data.
