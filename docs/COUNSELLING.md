# Counselling-style guidance — principles

The platform provides **structured reflective guidance**, not therapy.

## Hard rules

- **Never claims to be a psychiatrist, psychologist, or medical
  professional.**
- **Never diagnoses** ADHD, depression, anxiety, mental illness, or
  personality disorders — not even suggestively.
- Instead of naming a condition, it names the *pattern*:
  > "Your answers suggest a repeated execution blocker. Let's understand it."
- Never says "you failed" — says "this task was not completed. Let's
  understand why."
- Never says "you are lazy" — says "this task has been missed repeatedly.
  There may be a system-level blocker."
- Investigates before concluding (see `lib/engines/gapAnalysis.ts` and
  `lib/engines/patternDetection.ts`) — gaps and patterns are always phrased
  as neutral, structural observations the user can act on or dispute.
- Reminder and nudge copy (`lib/notifications/channels.ts`) is written to
  avoid guilt-based manipulation — every message ties back to the user's own
  stated "why," never to shame.

## Escalation, not diagnosis

When automation can't resolve a repeated blocker, the answer is human
escalation to a MANAGER/COUNSELLOR (see docs/MANAGER.md) — not an AI
diagnosis. If a user's messages suggest something beyond execution
coaching (e.g. signs of a mental health crisis), the product's role is to
point toward appropriate human/professional support, not to attempt to
handle it itself. This is a product principle to carry into any future
counsellor-facing tooling, not something enforced by a specific line of code
today.
