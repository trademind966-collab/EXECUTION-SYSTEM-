# Admin guide

## Bootstrapping the first admin

There is no default/hardcoded admin account. Create one explicitly:

```bash
BOOTSTRAP_ADMIN_EMAIL=you@example.com \
BOOTSTRAP_ADMIN_PASSWORD='a-strong-password-at-least-10-chars' \
npm run bootstrap-admin
```

This either creates a new `SUPER_ADMIN` user or promotes an existing account
with that email. Re-running it is safe (idempotent promote-or-create).

## What SUPER_ADMIN / ADMIN can do today

- Full read/write access to any user's goals/tasks/reviews via the existing
  API routes (`canAccessOwnedResource` grants staff access automatically).
- Everything a `USER` can do, for any account.

## What's scaffolded but not yet built

A dedicated `/admin` UI (user list, role management, platform-wide
analytics) is not yet implemented — see docs/ROADMAP.md. The `user_role`
enum, RBAC helpers, and `/admin` route prefix (protected by `proxy.ts`) are
already in place so this is additive work, not a redesign.

## Changing a user's role manually (until the admin UI exists)

```sql
update users set role = 'ADMIN' where email = 'someone@example.com';
```
