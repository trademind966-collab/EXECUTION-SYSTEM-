# Contributing

## Before opening a PR

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

All four must pass. CI (if configured) should run the same four commands.

## Conventions

- **SQL migrations are append-only.** Never edit an already-applied file in
  `supabase/migrations/`; add a new numbered file instead
  (`0002_your_change.sql`).
- **All DB access goes through `src/lib/db/index.ts`** (`query`, `queryOne`,
  `withTransaction`) — always parameterized queries, never string-built SQL.
- **Every API route validates input with Zod** before touching the
  database, and checks auth (`requireUser()`) + authorization
  (`canAccessOwnedResource` or role checks) before returning data.
- **AI-assisted engines need a fallback.** If you add a new AI-assisted
  feature under `src/lib/engines/` or `src/lib/ai/`, it must degrade to a
  deterministic, rule-based path when `OPENAI_API_KEY` is unset — see
  `gapAnalysis.ts` and `roadmap.ts` for the pattern.
- **Language matters.** Anything user-facing must avoid diagnosing mental
  health conditions or using negative labels (lazy, undisciplined, etc.) —
  see docs/COUNSELLING.md. This applies to error copy, reminder copy, and
  gap/pattern descriptions alike.
- **New non-`IN_APP`/`EMAIL` reminder channels** go through
  `dispatchReminder()` in `src/lib/notifications/channels.ts` — add a `case`
  block, required env var(s), and update docs/NOTIFICATIONS.md.
- Document any non-obvious product/engineering decision in
  `docs/DECISIONS.md` rather than only in a code comment.
