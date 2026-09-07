import { randomBytes, createHash } from "node:crypto";

/**
 * We never store raw tokens (session tokens, email-verification tokens,
 * password-reset tokens) in the database — only their SHA-256 hash.
 * The raw token is sent to the client once (cookie or link) and is
 * unrecoverable from the DB if it is ever leaked or dumped.
 */
export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
