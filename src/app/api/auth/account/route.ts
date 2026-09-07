import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getCurrentUser, destroySession } from "@/lib/auth/session";

/** Deactivate (reversible) — support can reactivate; keeps all data. */
export async function PATCH() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  await query(`update users set status = 'DEACTIVATED' where id = $1`, [user.id]);
  await destroySession();
  return NextResponse.json({ ok: true });
}

/**
 * Delete (destructive) — anonymizes personal fields and marks the account
 * DELETED rather than physically deleting the row outright, preserving
 * referential integrity for goals/tasks the user created while removing
 * personally identifying data. See docs/PRIVACY.md.
 */
export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  await query(
    `update users
       set status = 'DELETED',
           email = concat('deleted-', id, '@deleted.local'),
           full_name = null,
           password_hash = 'deleted'
     where id = $1`,
    [user.id]
  );
  await destroySession();
  return NextResponse.json({ ok: true });
}
