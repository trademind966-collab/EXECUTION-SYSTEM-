# Environment variables

`.env.example` is the authoritative template — copy it to `.env.local` for
local development (Next.js loads `.env.local` automatically; scripts in
`scripts/` load it via `dotenv`).

| Variable | Required? | Purpose |
|---|---|---|
| `DATABASE_URL` | **Required** | PostgreSQL connection string. |
| `APP_URL` | **Required** | Public base URL, used to build verification/reset links in emails. |
| `OPENAI_API_KEY` | Optional | Enables AI-assisted gap analysis, roadmap generation, and the question engine. Without it, deterministic rule-based fallbacks are used — the app still fully works. |
| `OPENAI_MODEL` | Optional | Defaults to `gpt-4o-mini`. |
| `RESEND_API_KEY` | Optional | Enables real email delivery via Resend. Without it, emails are logged to the server console (dev fallback). |
| `EMAIL_FROM` | Optional | From-address for outgoing email. |
| `PUSH_PROVIDER_API_KEY` | Optional | Enables the PUSH reminder channel once wired to a vendor (see docs/NOTIFICATIONS.md). |
| `WHATSAPP_API_TOKEN` | Optional | Enables the WHATSAPP reminder channel once wired to a vendor. |
| `SMS_PROVIDER_API_KEY` | Optional | Enables the SMS reminder channel once wired to a vendor. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Optional | Reserved for Google OAuth (architecture-ready, not required to run the app). |
| `APPLE_CLIENT_ID` / `APPLE_CLIENT_SECRET` | Optional | Reserved for Apple OAuth. |
| `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET` | Optional | Reserved for Microsoft OAuth. |
| `BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD` | Only for `npm run bootstrap-admin` | Not read by the running app — only by the one-off bootstrap script. Never commit real values. |

Never commit `.env.local` (already git-ignored) or put real secrets in
`.env.example`.
