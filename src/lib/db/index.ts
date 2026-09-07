import { Pool, type QueryResultRow } from "pg";

// Single shared connection pool for the whole server process.
// Reused across API routes via Next.js module caching.
declare global {
  var __pgPool: Pool | undefined;
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and configure it."
    );
  }
  return new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    // Supabase (and most hosted Postgres) requires SSL; local dev Postgres
    // does not use it. Toggle explicitly with PGSSL=require rather than
    // sniffing the hostname, so behavior is predictable everywhere.
    ssl: process.env.PGSSL === "require" ? { rejectUnauthorized: false } : undefined,
  });
}

export const pool = globalThis.__pgPool ?? createPool();
if (process.env.NODE_ENV !== "production") {
  globalThis.__pgPool = pool;
}

/**
 * Tagged-free helper for parameterised queries. Always use parameters ($1, $2, ...)
 * — never interpolate raw values into the SQL string.
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const result = await pool.query<T>(text, params as never[]);
  return result.rows;
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

/** Run a series of queries inside a single transaction. */
export async function withTransaction<T>(
  fn: (client: import("pg").PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
