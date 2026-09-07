# Product & engineering decisions

Where the spec asked us to choose the simplest secure and scalable option
without asking, here's what we chose and why.

## No ORM (Prisma) — raw SQL migrations instead
Prisma's query-engine binary download is blocked in this build environment
(and in many locked-down CI/sandbox setups). Since the stack already calls
for Supabase/Postgres, raw versioned SQL migrations are actually the more
native fit — Supabase itself is SQL-migration-first. We use the `pg` driver
directly with a small query/transaction helper (`src/lib/db/index.ts`).

## Sessions: opaque tokens in httpOnly cookies, not JWT
Session tokens are random, hashed (SHA-256) before storage, and stored in a
`sessions` table. This makes revocation trivial (delete the row) — unlike
stateless JWTs, which can't be invalidated before expiry without a denylist.
Middleware only checks for the cookie's *presence* (fast, edge-safe, UX
redirect); every API route re-validates the session against the DB — the
edge check is not a security boundary.

## Passwords: bcrypt, cost factor 12
Industry-standard, no external dependency, fast enough for interactive
signup/login without a queue.

## Execution Rate is a formula, not a "score"
Per spec section 56: `completed & verified tasks / due tasks`, always
returned with the raw counts and the formula string — never an opaque
AI-derived confidence number presented as psychology.

## Gap analysis & roadmap generation: AI-assisted with mandatory rule-based fallback
If `OPENAI_API_KEY` is unset, `lib/ai/client.ts` returns `null` and every
caller (`gapAnalysis.ts`, `roadmap.ts`, `questionEngine.ts`) falls back to a
deterministic, keyword/structure-based version. This keeps local dev, CI,
and any deployment without an OpenAI key fully functional — nothing is a
dead-end "coming soon" button.

## Reminder channels: IN_APP and EMAIL fully wired; PUSH/WHATSAPP/SMS architected only
These three require a paid third-party vendor account (FCM/APNs, WhatsApp
Business Cloud, Twilio/Vonage). Per spec section 62, we built the dispatch
interface, the env vars, and a clear runtime message describing exactly what
remains to configure, rather than faking success or leaving a dead button.

## Soft delete for goals and account deletion
Goals are marked `ABANDONED` rather than physically deleted, preserving
history for tasks/reviews/reminders that reference them. Account deletion
anonymizes PII (email, name, password hash) rather than deleting the row
outright, for the same referential-integrity reason — see docs/PRIVACY.md.

## RBAC: explicit role list + rank array, not a policy DSL
A generic permissions engine (e.g. attribute-based access control) is
over-engineering for the current eight roles. `lib/permissions/rbac.ts` is a
simple ranked list plus a handful of pure functions. This can be replaced
with a policy engine later without touching call sites, since everything
goes through the same three functions (`isAtLeast`, `isStaff`,
`canAccessOwnedResource`).

## Pattern detection threshold: 3 occurrences
Chosen as a reasonable, explainable default (matches the spec's own
"3 missed tasks" example in section 13). Configurable in
`lib/engines/patternDetection.ts` (`PATTERN_THRESHOLD`) if product data later
suggests a different number.
