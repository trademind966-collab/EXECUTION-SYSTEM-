import { describe, it, expect } from "vitest";
import { isAtLeast, isStaff, canAccessOwnedResource } from "@/lib/permissions/rbac";

describe("rbac", () => {
  it("ranks SUPER_ADMIN above USER", () => {
    expect(isAtLeast("SUPER_ADMIN", "USER")).toBe(true);
    expect(isAtLeast("USER", "SUPER_ADMIN")).toBe(false);
  });

  it("treats MANAGER and COUNSELLOR as staff, VIEWER as not", () => {
    expect(isStaff("MANAGER")).toBe(true);
    expect(isStaff("COUNSELLOR")).toBe(true);
    expect(isStaff("VIEWER")).toBe(false);
  });

  it("lets owners access their own resources regardless of role", () => {
    expect(canAccessOwnedResource("USER", "user-1", "user-1")).toBe(true);
  });

  it("blocks a USER from another user's resource, but allows staff", () => {
    expect(canAccessOwnedResource("USER", "user-1", "user-2")).toBe(false);
    expect(canAccessOwnedResource("ADMIN", "user-1", "user-2")).toBe(true);
  });
});
