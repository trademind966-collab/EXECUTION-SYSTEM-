export type Role =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "MANAGER"
  | "COUNSELLOR"
  | "USER"
  | "ORGANIZATION_OWNER"
  | "TEAM_LEAD"
  | "VIEWER";

/**
 * Ordered from most to least privileged for simple hierarchy checks.
 * Kept intentionally simple (role list, not a full policy engine) — see
 * docs/DECISIONS.md for why we didn't build a generic permissions DSL yet.
 */
const ROLE_RANK: Role[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "MANAGER",
  "COUNSELLOR",
  "ORGANIZATION_OWNER",
  "TEAM_LEAD",
  "USER",
  "VIEWER",
];

export function isAtLeast(role: Role, minimum: Role): boolean {
  const roleIdx = ROLE_RANK.indexOf(role);
  const minIdx = ROLE_RANK.indexOf(minimum);
  if (roleIdx === -1 || minIdx === -1) return false;
  return roleIdx <= minIdx;
}

export function isStaff(role: Role): boolean {
  return role === "SUPER_ADMIN" || role === "ADMIN" || role === "MANAGER" || role === "COUNSELLOR";
}

export function canAccessAdminPanel(role: Role): boolean {
  return role === "SUPER_ADMIN" || role === "ADMIN";
}

export function canAccessManagerConsole(role: Role): boolean {
  return isStaff(role);
}

/** A user may only read/write their own goals & tasks unless they are staff. */
export function canAccessOwnedResource(
  role: Role,
  resourceOwnerId: string,
  requestingUserId: string
): boolean {
  if (resourceOwnerId === requestingUserId) return true;
  return isStaff(role);
}
