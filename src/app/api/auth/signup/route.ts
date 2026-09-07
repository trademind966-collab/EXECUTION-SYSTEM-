import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { hashPassword, validatePasswordStrength } from "@/lib/auth/password";
import { generateToken, hashToken } from "@/lib/auth/tokens";
import { createSession } from "@/lib/auth/session";
import { signupSchema } from "@/lib/validation/auth";
import { sendEmail, verificationEmail } from "@/lib/notifications/email";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { email, password, fullName } = parsed.data;

  const strengthError = validatePasswordStrength(password);
  if (strengthError) {
    return NextResponse.json({ error: strengthError }, { status: 400 });
  }

  const existing = await queryOne(`select id from users where email = $1`, [email]);
  if (existing) {
    // Do not reveal whether the account exists beyond this generic message.
    return NextResponse.json({ error: "Could not create account with these details." }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const user = await queryOne<{ id: string }>(
    `insert into users (email, password_hash, full_name) values ($1,$2,$3) returning id`,
    [email, passwordHash, fullName ?? null]
  );
  if (!user) {
    return NextResponse.json({ error: "Signup failed." }, { status: 500 });
  }

  // Email verification token
  const token = generateToken();
  await query(
    `insert into email_verification_tokens (user_id, token_hash, expires_at)
     values ($1, $2, now() + interval '24 hours')`,
    [user.id, hashToken(token)]
  );
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const link = `${appUrl}/api/auth/verify-email?token=${token}`;
  const email_content = verificationEmail(link);
  await sendEmail({ to: email, ...email_content });

  await createSession(user.id);

  return NextResponse.json({ ok: true, userId: user.id }, { status: 201 });
}
