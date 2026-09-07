# Security

## Authentication
- Passwords hashed with bcrypt (cost factor 12), never stored or logged in
  plaintext.
- Sessions are opaque random tokens (32 bytes), SHA-256-hashed before
  storage; the raw token lives only in an `httpOnly`, `SameSite=Lax` cookie
  (`Secure` in production).
- Email verification and password-reset tokens follow the same
  generate-random / store-hash pattern, with expiry (24h / 1h respectively)
  and single-use enforcement (`used_at`).
- Login and signup responses never reveal whether an email exists in the
  system (constant error message).
- Password reset invalidates all existing sessions for that user.

## Authorization
- Role-based access control (`lib/permissions/rbac.ts`): every API route
  that touches a specific resource (goal, task, review) checks
  `canAccessOwnedResource` — the resource owner or staff (MANAGER/COUNSELLOR/
  ADMIN/SUPER_ADMIN) only.
- `middleware`/`proxy.ts` only performs a fast cookie-presence check for
  redirect UX — it is edge runtime and cannot query Postgres. The real
  authorization check happens again, every time, in the API route itself via
  `requireUser()` and the RBAC helpers. Treat the middleware layer as UX,
  not a security boundary.

## Secrets
- No secret (DB credentials, OpenAI key, email/SMS/push provider keys) is
  ever sent to the client or embedded in any client component. All access
  happens in server-only code (API routes, server components, scripts).
- `.env.local` is git-ignored; `.env.example` contains only empty
  placeholders.
- No admin password is ever hardcoded — `scripts/bootstrap-admin.ts`
  requires `BOOTSTRAP_ADMIN_EMAIL`/`BOOTSTRAP_ADMIN_PASSWORD` to be supplied
  explicitly at run time.

## Input validation
- Every API route validates its input with Zod before touching the
  database. All SQL uses parameterized queries (`$1, $2, ...`) — never
  string interpolation.

## Data integrity
- Foreign keys and `on delete cascade` are used deliberately (e.g. deleting
  a goal cascades its tasks) but user-facing "delete" actions use soft
  deletes (goal → `ABANDONED`, account → `DELETED` + anonymized) to avoid
  silently breaking review/audit history — see docs/PRIVACY.md.

## Pre-production checklist
- [ ] Set a strong, unique `DATABASE_URL` with a least-privilege DB role
      (not the Postgres superuser).
- [ ] Set `NODE_ENV=production` so cookies get the `Secure` flag.
- [ ] Configure `RESEND_API_KEY` (or your email provider) — without it,
      emails only log to the server console.
- [ ] Rotate `OPENAI_API_KEY` if it was ever used in a shared/dev environment.
- [ ] Run `npm run bootstrap-admin` once, then remove
      `BOOTSTRAP_ADMIN_PASSWORD` from the environment.
- [ ] Put the app behind HTTPS/TLS (required for `Secure` cookies to work at
      all).
- [ ] Configure rate limiting at the edge/proxy for `/api/auth/*` routes
      (not implemented in-app — see docs/DEPLOYMENT.md).
- [ ] Review `docs/PRIVACY.md` and confirm your deployment's data retention
      matches what you tell users in the consent copy.
- [ ] Run `npm run build`, `npm run typecheck`, `npm run lint`, and
      `npm test` in CI before every deploy.
