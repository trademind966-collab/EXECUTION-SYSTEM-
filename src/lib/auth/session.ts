import { cookies } from "next/headers";
import { queryOne, query } from "@/lib/db";
import { generateToken, hashToken } from "./tokens";
import { SESSION_COOKIE } from "./constants";

export { SESSION_COOKIE };
const SESSION_TTL_DAYS = 30;

export interface SessionUser {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  status: string;
  email_verified_at: string | null;
  accountability_style: string | null;
}

export async function createSession(
  userId: string,
  meta: { userAgent?: string; ip?: string } = {}
): Promise<string> {
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  await query(
    `insert into sessions (user_id, token_hash, user_agent, ip_address, expires_at)
     values ($1, $2, $3, $4, $5)`,
    [userId, tokenHash, meta.userAgent ?? null, meta.ip ?? null, expiresAt]
  );

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  return token;
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await query(`delete from sessions where token_hash = $1`, [hashToken(token)]);
  }
  store.delete(SESSION_COOKIE);
}

/** Reads the session cookie and returns the current user, or null. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const row = await queryOne<SessionUser & { expires_at: string }>(
    `select u.id, u.email, u.full_name, u.role, u.status, u.email_verified_at, u.accountability_style,
            s.expires_at
     from sessions s
     join users u on u.id = s.user_id
     where s.token_hash = $1`,
    [hashToken(token)]
  );

  if (!row) return null;
  if (new Date(row.expires_at) < new Date()) return null;
  if (row.status !== "ACTIVE") return null;

  const user: SessionUser = {
    id: row.id,
    email: row.email,
    full_name: row.full_name,
    role: row.role,
    status: row.status,
    email_verified_at: row.email_verified_at,
    accountability_style: row.accountability_style,
  };
  return user;
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthError("UNAUTHENTICATED", "You must be signed in.");
  }
  return user;
}

export class AuthError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}
