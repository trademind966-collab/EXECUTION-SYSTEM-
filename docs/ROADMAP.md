# Product roadmap — implemented vs future

## Implemented

- Email/password auth: signup, login, logout, email verification,
  forgot/reset/change password, session management, account
  deactivate/delete.
- 14-question guided onboarding with accountability-style preference.
- Goal CRUD with full field set (why, current/target state, resources,
  constraints, blockers, deadline, priority, status).
- Gap analysis engine across 10 categories, AI-assisted with rule-based
  fallback, never assumes laziness/undiscipline.
- 30-day roadmap generation (extremely small tasks, explicit dependencies),
  AI-assisted with rule-based fallback.
- Approval flow: GENERATED → user reviews/edits → APPROVE → ACTIVE (AI never
  auto-activates a plan).
- Dependency-locked task engine: a task stays LOCKED until its dependency is
  COMPLETED (verified with an integration test).
- Single "what's the ONE task now" primary-task query for the dashboard.
- Missed-task flow with reason capture + reason-specific follow-up question.
- Repeated-failure pattern detection (3+ same-reason misses) +
  acknowledge/escalate to human review.
- Explainable execution rate (`completed / due`, formula always shown).
- Dynamic follow-up question engine (AI-assisted, rule-based branches as
  fallback).
- Reviews (weekly/30-day) capturing what worked/failed/changed/next test.
- Reminder scheduling + IN_APP/EMAIL dispatch; PUSH/WHATSAPP/SMS
  architected, pending vendor credentials.
- RBAC across 8 roles (5 active, 3 future-ready), enforced on every API
  route.
- Full SQL schema, migration runner, seed script, secure admin bootstrap.
- Unit + integration tests; clean typecheck/lint/build.

## Near-term future work

- Admin console UI (`/admin`) — user list, role management. Data model and
  RBAC already support it.
- Manager/Counsellor console UI (`/manager`) — escalation queue, per-user
  execution history. `escalations`/`patterns` tables and API already exist.
- Nudge preference settings UI (table exists: `nudge_preferences`).
- "Export all my data" single-click bundling of the existing per-resource
  export endpoints.
- OAuth (Google/Apple/Microsoft) — architecture-ready env vars are defined;
  provider integration itself isn't wired.
- Real push/WhatsApp/SMS vendor integration (see docs/NOTIFICATIONS.md).
- Billing/subscription enforcement (see docs/BILLING.md) — requires a
  payment processor account.
- Scheduled/background job runner to actually fire due reminders on a timer
  (today, `/api/reminders/dispatch` is called on-demand; a cron/queue would
  automate this in production).

## Explicitly out of scope for this build

Anything requiring a live external credential this environment doesn't have
access to (payment processor, push/SMS/WhatsApp vendor, OAuth app
registrations) — built as architecture + clear setup docs instead of a fake
button, per the product spec's own rule against placeholders.
