# Manager / Counsellor guide

## Escalation flow (spec section 54)

```
USER REQUESTS HELP → ESCALATION → MANAGER/COUNSELLOR → HUMAN REVIEW → ACTION → RESOLUTION
```

Implemented today via `lib/engines/patternDetection.ts` and the
`escalations` table:

1. The pattern-detection engine flags a repeated blocker (3+ misses citing
   the same reason) as an `OPEN` pattern.
2. `POST /api/patterns/:id/escalate` creates an `escalations` row
   (`REQUESTED` status) and marks the pattern `ACKNOWLEDGED`.
3. A MANAGER/COUNSELLOR can be assigned (`assigned_to`) and update status to
   `IN_REVIEW` then `RESOLVED`, with free-text `notes`.

## What's scaffolded but not yet built

A dedicated `/manager` console (list of escalations assigned to me, per-user
execution history view) is not yet implemented. The data model and API
(`patterns`, `escalations` tables; `/api/patterns/*` routes) already support
it — building the console is additive UI work, not a schema change. See
docs/ROADMAP.md.

## Principles for human reviewers

Same as the automated system (see docs/COUNSELLING.md): investigate before
concluding, use neutral language (pattern / signal / blocker / risk /
improvement opportunity, never "lazy" or "undisciplined"), and keep the user
in control of their own plan.
