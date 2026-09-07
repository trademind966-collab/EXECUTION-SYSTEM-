# Notifications architecture

## Channels

| Channel | Status | What's needed |
|---|---|---|
| `IN_APP` | **Implemented** | Nothing — rows in `reminders` rendered by the dashboard. |
| `EMAIL` | **Implemented** | `RESEND_API_KEY` + `EMAIL_FROM`. Without a key, emails log to the server console (dev fallback) instead of failing. |
| `PUSH` | Architected, not wired | `PUSH_PROVIDER_API_KEY` + a device push token per user (not yet collected) + an actual FCM/APNs integration in `lib/notifications/channels.ts`. |
| `WHATSAPP` | Architected, not wired | `WHATSAPP_API_TOKEN` + user's phone number (not yet collected) + WhatsApp Business Cloud API call. |
| `SMS` | Architected, not wired | `SMS_PROVIDER_API_KEY` + user's phone number + a Twilio/Vonage/etc. call. |

All five share one dispatch function, `dispatchReminder()` in
`src/lib/notifications/channels.ts`, so adding a real vendor for
PUSH/WHATSAPP/SMS means filling in one `case` block each — no architectural
change required.

## Reminder types

`TASK_REMINDER`, `UPCOMING_DEADLINE`, `MISSED_TASK`, `PATTERN_REMINDER`,
`WEEKLY_REVIEW`, `THIRTY_DAY_REVIEW`, `GOAL_REMINDER` — stored as an enum on
the `reminders` table; scheduled via `POST /api/reminders`, sent via
`POST /api/reminders/dispatch`.

## Copy principles

`reminderMessage()` generates copy that always ties back to the user's own
stated "why" or the concrete next step — never guilt/shame language. See
docs/COUNSELLING.md.

## User control

`nudge_preferences` (per user, per nudge type: `BEFORE_TASK`, `AFTER_MISS`,
`AFTER_COMPLETE`, `GOAL_REMINDER`) lets a user disable specific nudges. The
table exists in the schema; a settings UI to toggle it is not yet built (see
docs/ROADMAP.md) but the API surface (`/api/reminders`) doesn't require it to
function.
