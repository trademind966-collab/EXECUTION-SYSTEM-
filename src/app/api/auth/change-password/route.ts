import { NextRequest, NextResponse } from "next/server";
import { queryOne, query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { hashPassword, verifyPassword, validatePasswordStrength } from "@/lib/auth/password";
import { changePasswordSchema } from "@/lib/validation/auth";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const strengthError = validatePasswordStrength(parsed.data.newPassword);
  if (strengthError) return NextResponse.json({ error: strengthError }, { status: 400 });

  const row = await queryOne<{ password_hash: string }>(`select password_hash from users where id = $1`, [
    user.id,
  ]);
  if (!row || !(await verifyPassword(parsed.data.currentPassword, row.password_hash))) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
  }

  const newHash = await hashPassword(parsed.data.newPassword);
  await query(`update users set password_hash = $2 where id = $1`, [user.id, newHash]);

  return NextResponse.json({ ok: true });
}
