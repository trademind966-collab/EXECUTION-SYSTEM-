# Deployment

This repo is a standard Next.js app + Postgres — deploy however you deploy
Next.js today. Two common paths:

## Option A: Vercel (or similar) + hosted Postgres (Supabase/Neon/RDS)

1. Provision a Postgres instance (e.g. a Supabase project — the schema in
   `supabase/migrations/` is written to be Supabase-compatible SQL).
2. Set `DATABASE_URL` to that instance's connection string in your host's
   environment variables (use the pooled/connection-pooler URL if the host
   offers one, since serverless functions open many short-lived
   connections).
3. Set `APP_URL` to your production URL.
4. Set `OPENAI_API_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, and any reminder
   channel keys you have.
5. Run migrations against production **before** the first deploy serves
   traffic:
   ```bash
   DATABASE_URL=<production-url> npm run db:migrate
   ```
6. Deploy (`npm run build && npm start`, or your host's build pipeline).
7. Bootstrap the first admin:
   ```bash
   DATABASE_URL=<production-url> BOOTSTRAP_ADMIN_EMAIL=... BOOTSTRAP_ADMIN_PASSWORD=... npm run bootstrap-admin
   ```

## Option B: self-hosted (VM/container) + local Postgres

1. Provision Postgres 14+ on the same host or network.
2. Same env var / migrate / bootstrap steps as above.
3. Run `npm run build` then `npm start` behind a reverse proxy (nginx/Caddy)
   terminating TLS — required for `Secure` session cookies to function.
4. Use a process manager (systemd, pm2) to keep `npm start` running and
   restart on crash.

## Rate limiting

Not implemented in-app. Put `/api/auth/*` (signup, login, forgot-password)
behind rate limiting at your reverse proxy or edge/CDN layer before
production launch — see the checklist in docs/SECURITY.md.

## Running migrations safely

`npm run db:migrate` tracks applied files in a `_migrations` table, so it's
always safe to re-run on deploy — it only applies new migration files.
Never edit an already-applied migration file; add a new one instead.
