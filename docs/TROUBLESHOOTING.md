# Troubleshooting

**`DATABASE_URL is not set`** (from `scripts/*.ts`)
Copy `.env.example` to `.env.local` and set `DATABASE_URL`. Scripts load
`.env.local` explicitly via `dotenv` — Next.js does this automatically for
the running app, but standalone scripts need it too.

**`connection to server ... failed: Connection refused`**
Postgres isn't running. `service postgresql start` (or start your
Docker/hosted instance) and confirm `DATABASE_URL` matches its host/port.

**Migration fails with `type "X" already exists` / `relation already exists`**
You likely applied `0001_init.sql` manually outside of `npm run db:migrate`
(which wouldn't have recorded it in `_migrations`). Either drop and recreate
the schema (`DROP SCHEMA public CASCADE; CREATE SCHEMA public;` — **destroys
all data**, dev only) or manually `insert into _migrations (filename) values
('0001_init.sql')` if you're certain the schema already matches.

**Emails aren't arriving**
Without `RESEND_API_KEY` set, email sending intentionally falls back to
logging the email content to the server console — check your terminal/logs,
not your inbox. Set `RESEND_API_KEY` for real delivery.

**Gap analysis / roadmap generation looks generic**
`OPENAI_API_KEY` isn't set, so the deterministic rule-based fallback is
running — this is expected behavior, not a bug. Set the key for AI-assisted
output.

**`useSearchParams() should be wrapped in a suspense boundary` during build**
If you add a new client page that reads query params, wrap the part using
`useSearchParams()` in a `<Suspense>` boundary (see `src/app/(auth)/login/page.tsx`
and `src/app/reset-password/page.tsx` for the pattern).

**Middleware / edge runtime errors mentioning `node:crypto`**
Anything imported by `src/proxy.ts` (middleware) runs on the edge runtime,
which can't use Node-only APIs. Keep `proxy.ts` importing only edge-safe
code (see `src/lib/auth/constants.ts` — the session cookie name is
deliberately split out from `session.ts`, which uses `node:crypto`, for this
reason).

**Tests fail with connection errors**
Integration tests need a reachable `DATABASE_URL` (loaded via
`tests/setup.ts`). They're designed to skip gracefully with a console
warning if Postgres isn't reachable — a hard failure usually means
`.env.local` is missing or Postgres isn't running.
