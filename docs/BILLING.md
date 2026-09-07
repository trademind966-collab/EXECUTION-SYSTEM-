# Billing architecture

Not implemented in this build — this document describes the intended shape
so it can be added without restructuring the goal/task model.

## Where subscription limits plug in

Spec section 6 states goal count is limited "depending on subscription."
The natural integration point is a `subscriptions` table
(`user_id`, `plan`, `status`, `renews_at`, provider fields like
`stripe_customer_id`/`stripe_subscription_id`) plus a single guard in
`POST /api/goals`:

```ts
const activeGoalCount = await countActiveGoals(user.id);
const limit = planLimits[subscription.plan].maxGoals;
if (activeGoalCount >= limit) {
  return NextResponse.json({ error: "Goal limit reached for your plan." }, { status: 402 });
}
```

## Suggested plan shape (not implemented)

| Plan | Max active goals | Notes |
|---|---|---|
| Free | 1 | Core loop, rule-based fallback engines |
| Pro | 5 | AI-assisted engines, all reminder channels once vendors are wired |
| Team/Org | Per-seat | Requires `ORGANIZATION_OWNER`/`TEAM_LEAD` roles (already reserved in the schema) |

## Why this wasn't built now

Billing requires a real payment processor account (Stripe or similar) and
webhook handling — an external credential this environment doesn't have.
Building a fake billing UI would violate the spec's own rule against
placeholder features (section 62). See docs/ROADMAP.md for what's actually
implemented vs. future.
