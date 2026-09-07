# Testing

## Commands

```bash
npm run typecheck   # tsc --noEmit — zero errors required
npm run lint         # eslint — zero errors required (warnings are OK)
npm test             # vitest run — unit + integration
npm run build        # next build — must succeed; this is the final gate
```

## What's covered

- **Unit** (`tests/unit/`):
  - `gapAnalysis.test.ts` — the rule-based fallback never uses negative
    labels ("lazy", "undisciplined", etc.) and correctly reflects the user's
    own stated blocker.
  - `taskEngine.test.ts` — every missed-task reason maps to a distinct,
    reason-specific follow-up question.
  - `rbac.test.ts` — role ranking, staff detection, and owned-resource
    access checks.
- **Integration** (`tests/integration/`):
  - `taskDependency.test.ts` — runs against a real (local) Postgres
    instance: persists a two-task roadmap with a dependency, confirms both
    tasks start `LOCKED`, confirms only the dependency-free task becomes
    `READY` on approval, completes it, and confirms the dependent task
    unlocks. This directly exercises spec section 10 end-to-end.

Integration tests auto-skip (with a console warning, not a failure) if
`DATABASE_URL` isn't reachable, so `npm test` stays usable in environments
without Postgres.

## Adding more tests

- Prefer integration tests (real DB) for anything involving the `tasks`,
  `roadmaps`, or `patterns` tables — the dependency-locking and pattern
  logic is expressed in SQL + TypeScript together, so mocking the DB would
  hide real bugs.
- Prefer unit tests for pure functions (RBAC, copy generators, the rule-based
  AI fallbacks).
- `vitest.config.ts` resolves the `@/*` path alias the same way Next.js
  does, so imports don't need special-casing in tests.
