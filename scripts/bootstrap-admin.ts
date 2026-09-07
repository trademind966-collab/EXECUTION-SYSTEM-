import { Pool } from "pg";
import bcrypt from "bcryptjs";
import { config } from "dotenv";
config({ path: ".env.local" });
config();

/**
 * Creates (or promotes) the first SUPER_ADMIN account.
 *
 * Usage:
 *   BOOTSTRAP_ADMIN_EMAIL=you@example.com BOOTSTRAP_ADMIN_PASSWORD='a-strong-password' npm run bootstrap-admin
 *
 * Both env vars are required — there is no default/hardcoded password.
 * If the email already exists, the existing user is promoted to
 * SUPER_ADMIN instead of creating a duplicate account.
 */
async function main() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL;
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  if (!email || !password) {
    console.error(
      "Set BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD environment variables before running this script."
    );
    process.exit(1);
  }
  if (password.length < 10) {
    console.error("BOOTSTRAP_ADMIN_PASSWORD must be at least 10 characters.");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl: process.env.PGSSL === "require" ? { rejectUnauthorized: false } : undefined,
  });
  const hash = await bcrypt.hash(password, 12);

  const existing = await pool.query(`select id from users where email = $1`, [email]);

  if (existing.rows.length > 0) {
    await pool.query(`update users set role = 'SUPER_ADMIN', status = 'ACTIVE' where email = $1`, [
      email,
    ]);
    console.log(`Promoted existing user ${email} to SUPER_ADMIN.`);
  } else {
    await pool.query(
      `insert into users (email, password_hash, role, status, email_verified_at)
       values ($1, $2, 'SUPER_ADMIN', 'ACTIVE', now())`,
      [email, hash]
    );
    console.log(`Created SUPER_ADMIN account for ${email}.`);
  }

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
