import { NextRequest, NextResponse } from "next/server";
import { queryOne, withTransaction } from "@/lib/db";
import { hashToken } from "@/lib/auth/tokens";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Missing token." }, { status: 400 });
  }

  const tokenHash = hashToken(token);
  const record = await queryOne<{ id: string; user_id: string; expires_at: string; used_at: string | null }>(
    `select id, user_id, expires_at, used_at from email_verification_tokens where token_hash = $1`,
    [tokenHash]
  );

  if (!record || record.used_at || new Date(record.expires_at) < new Date()) {
    return NextResponse.json({ error: "This verification link is invalid or expired." }, { status: 400 });
  }

  await withTransaction(async (client) => {
    await client.query(`update users set email_verified_at = now() where id = $1`, [record.user_id]);
    await client.query(`update email_verification_tokens set used_at = now() where id = $1`, [record.id]);
  });

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  return NextResponse.redirect(`${appUrl}/dashboard?verified=1`);
}
