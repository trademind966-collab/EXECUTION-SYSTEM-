# Roles & RBAC

## Roles

| Role | Description |
|---|---|
| `SUPER_ADMIN` | Full platform control, including promoting/demoting other admins. |
| `ADMIN` | Platform administration (users, goals oversight, configuration). |
| `MANAGER` | Oversees a group of users; can view escalations assigned to them. |
| `COUNSELLOR` | Human-review role for escalated patterns/blockers (see docs/COUNSELLING.md). |
| `USER` | Default role — owns their own goals/tasks/reviews. |
| `ORGANIZATION_OWNER` *(future-ready)* | Reserved for multi-tenant/org accounts. |
| `TEAM_LEAD` *(future-ready)* | Reserved for team-level oversight within an org. |
| `VIEWER` *(future-ready)* | Reserved for read-only stakeholders. |

Future-ready roles exist in the `user_role` enum and `lib/permissions/rbac.ts`
today so adding organization/team features later doesn't require a schema
migration — but no UI currently exercises them.

## How access is enforced

Every protected API route:

1. Calls `requireUser()` — throws `AuthError` (→ 401) if not authenticated.
2. For resource-scoped routes (a specific goal/task/review), loads the
   resource and calls `canAccessOwnedResource(role, resourceOwnerId,
   requestingUserId)` — the owner or staff (`MANAGER`/`COUNSELLOR`/`ADMIN`/
   `SUPER_ADMIN`) only.
3. For staff-only surfaces (future admin/manager consoles), use
   `canAccessAdminPanel` / `canAccessManagerConsole`.

`isAtLeast(role, minimum)` gives a simple hierarchy check
(`SUPER_ADMIN > ADMIN > MANAGER > COUNSELLOR > ...`) for anything that needs
"at least this privileged."
