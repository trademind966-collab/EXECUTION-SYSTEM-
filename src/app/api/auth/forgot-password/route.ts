import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { generateToken, hashToken } from "@/lib/auth/tokens";
import { forgotPasswordSchema } from "@/lib/validation/auth";
import { sendEmail, passwordResetEmail } from "@/lib/notifications/email";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email." }, { status: 400 });
  }

  const user = await queryOne<{ id: string }>(`select id from users where email = $1`, [
    parsed.data.email,
  ]);

  // Always return success to avoid leaking whether the email exists.
  if (user) {
    const token = generateToken();
    await query(
      `insert into password_reset_tokens (user_id, token_hash, expires_at)
       values ($1, $2, now() + interval '1 hour')`,
      [user.id, hashToken(token)]
    );
    const appUrl = process.env.APP_URL ?? "http://localhost:3000";
    const link = `${appUrl}/reset-password?token=${token}`;
    await sendEmail({ to: parsed.data.email, ...passwordResetEmail(link) });
  }

  return NextResponse.json({ ok: true });
}
