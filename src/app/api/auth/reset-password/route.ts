import { NextRequest, NextResponse } from "next/server";
import { queryOne, withTransaction } from "@/lib/db";
import { hashPassword, validatePasswordStrength } from "@/lib/auth/password";
import { hashToken } from "@/lib/auth/tokens";
import { resetPasswordSchema } from "@/lib/validation/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const strengthError = validatePasswordStrength(parsed.data.password);
  if (strengthError) {
    return NextResponse.json({ error: strengthError }, { status: 400 });
  }

  const tokenHash = hashToken(parsed.data.token);
  const record = await queryOne<{ id: string; user_id: string; expires_at: string; used_at: string | null }>(
    `select id, user_id, expires_at, used_at from password_reset_tokens where token_hash = $1`,
    [tokenHash]
  );

  if (!record || record.used_at || new Date(record.expires_at) < new Date()) {
    return NextResponse.json({ error: "This reset link is invalid or expired." }, { status: 400 });
  }

  const newHash = await hashPassword(parsed.data.password);

  await withTransaction(async (client) => {
    await client.query(`update users set password_hash = $2 where id = $1`, [record.user_id, newHash]);
    await client.query(`update password_reset_tokens set used_at = now() where id = $1`, [record.id]);
    // Invalidate all existing sessions on password reset.
    await client.query(`delete from sessions where user_id = $1`, [record.user_id]);
  });

  return NextResponse.json({ ok: true });
}
