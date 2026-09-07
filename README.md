# Execution System

Turn a goal into a real execution system: find the gap between where you are
and where you want to be, break it into extremely small tasks, track what you
actually did (not what you said you'd do), understand why tasks get missed,
and improve the plan over time.

Full loop: **Goal → Why → Current Reality → Gap Analysis → Strategy → 30‑Day
Roadmap → Small Tasks → Reminder → Execution → Verification → Result → Why
did it work/fail? → Behavior/System Analysis → Process Improvement → Next
Task.**

The AI never forces a plan on you. It asks questions, analyzes gaps, proposes
tasks and roadmaps — you edit, reject, postpone, or approve everything before
it goes active.

## Contents

- [Architecture](docs/ARCHITECTURE.md)
- [Product & engineering decisions](docs/DECISIONS.md)
- [Security](docs/SECURITY.md)
- [Privacy](docs/PRIVACY.md)
- [Roles & RBAC](docs/ROLES.md)
- [Admin guide](docs/ADMIN.md)
- [Manager/Counsellor guide](docs/MANAGER.md)
- [Counselling-style guidance principles](docs/COUNSELLING.md)
- [Notifications architecture](docs/NOTIFICATIONS.md)
- [Billing architecture](docs/BILLING.md)
- [Testing](docs/TESTING.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Environment variables](docs/ENVIRONMENT.md)
- [Local setup](docs/LOCAL_SETUP.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [Product roadmap — implemented vs future](docs/ROADMAP.md)
- [Contributing](docs/CONTRIBUTING.md)

## Tech stack

- **Next.js 16** (App Router) + **TypeScript** + **React 19**
- **Tailwind CSS 4**
- **PostgreSQL** via the `pg` driver — raw, version-controlled SQL migrations
  in `supabase/migrations/` (no Prisma/ORM; see [DECISIONS.md](docs/DECISIONS.md))
- **Zod** for input validation
- **OpenAI API** for AI-assisted gap analysis, roadmap generation, and the
  dynamic question engine — every AI-assisted engine has a deterministic
  rule-based fallback, so the product works end-to-end with no API key

## Requirements

- Node.js 20+
- npm
- A reachable PostgreSQL 14+ instance

## Quick start

```bash
git clone <this-repo>
cd execution-system
npm install
cp .env.example .env.local   # then edit DATABASE_URL at minimum
npm run db:migrate
npm run db:seed              # optional: sample users/goal/tasks
npm run dev
```

Open http://localhost:3000, sign up, and go through onboarding — or log in
with a seeded account (see [LOCAL_SETUP.md](docs/LOCAL_SETUP.md)).

## Environment variables

See [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md) for every variable explained.
`.env.example` is the authoritative template.

## Database setup

Schema lives in `supabase/migrations/*.sql`, applied in order by
`npm run db:migrate` (tracked in a `_migrations` table so it's safe to
re-run). See [docs/LOCAL_SETUP.md](docs/LOCAL_SETUP.md) for details and
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for running migrations in
production (e.g. against a hosted Supabase/Postgres instance).

## Local development

```bash
npm run dev          # start the app at http://localhost:3000
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm test             # vitest (unit + integration)
```

## Build

```bash
npm run build
npm start
```

## Admin setup

No admin password is ever hardcoded. Create the first `SUPER_ADMIN` with:

```bash
BOOTSTRAP_ADMIN_EMAIL=you@example.com BOOTSTRAP_ADMIN_PASSWORD='a-strong-password' npm run bootstrap-admin
```

See [docs/ADMIN.md](docs/ADMIN.md).

## AI setup

Set `OPENAI_API_KEY` (and optionally `OPENAI_MODEL`, default
`gpt-4o-mini`) in `.env.local`. Without a key, gap analysis, roadmap
generation, and the question engine automatically fall back to
deterministic rule-based logic — nothing is blocked or fake.

## Security

See [docs/SECURITY.md](docs/SECURITY.md) and the pre-launch
[security checklist](docs/SECURITY.md#pre-production-checklist).

## Troubleshooting

See [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md).
