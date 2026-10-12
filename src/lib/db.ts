import { Pool, type QueryResultRow } from "pg";

/**
 * PostgreSQL access layer using the `pg` connection pool.
 *
 * Drop-in async replacement for the previous node:sqlite layer.
 * Every function is async; call sites must `await` them.
 *
 * The pool is cached on globalThis so Next.js hot-reloads in dev do not
 * open a new connection for every module evaluation.
 */

export type Params = (string | number | boolean | null | undefined)[];

declare global {
  // eslint-disable-next-line no-var
  var __examPlatformPgPool: Pool | undefined;
}

function getPool(): Pool {
  if (globalThis.__examPlatformPgPool) return globalThis.__examPlatformPgPool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set.\n" +
        "Add it to .env (locally) or to Vercel Environment Variables.",
    );
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 5,               // serverless: keep small
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

  globalThis.__examPlatformPgPool = pool;
  return pool;
}

/**
 * Convert SQLite-style `?` positional placeholders to PostgreSQL `$1, $2, …`.
 * Also handles the SQLite boolean-as-integer convention by passing values
 * through unchanged (pg handles JS booleans natively).
 */
function toPgSql(sql: string): string {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

/** Run a query and return every row. */
export async function all<T extends QueryResultRow>(
  sql: string,
  params: Params = [],
): Promise<T[]> {
  const { rows } = await getPool().query<T>(toPgSql(sql), params as unknown[]);
  return rows;
}

/** Run a query and return the first row, or undefined. */
export async function one<T extends QueryResultRow>(
  sql: string,
  params: Params = [],
): Promise<T | undefined> {
  const { rows } = await getPool().query<T>(toPgSql(sql), params as unknown[]);
  return rows[0];
}

/** Run a statement and return the number of affected rows. */
export async function run(
  sql: string,
  params: Params = [],
): Promise<{ changes: number }> {
  const result = await getPool().query(toPgSql(sql), params as unknown[]);
  return { changes: result.rowCount ?? 0 };
}

/**
 * Run `fn` inside a single PostgreSQL transaction. Rolled back if `fn` throws.
 *
 * The callback receives a `query` helper that routes through the same client
 * so all statements share the transaction.
 */
export async function transaction<T>(
  fn: (q: {
    all: <R extends QueryResultRow>(sql: string, params?: Params) => Promise<R[]>;
    one: <R extends QueryResultRow>(sql: string, params?: Params) => Promise<R | undefined>;
    run: (sql: string, params?: Params) => Promise<{ changes: number }>;
  }) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn({
      all: async <R extends QueryResultRow>(sql: string, params: Params = []) => {
        const r = await client.query<R>(toPgSql(sql), params as unknown[]);
        return r.rows;
      },
      one: async <R extends QueryResultRow>(sql: string, params: Params = []): Promise<R | undefined> => {
        const r = await client.query<R>(toPgSql(sql), params as unknown[]);
        return r.rows[0] as R | undefined;
      },
      run: async (sql: string, params: Params = []) => {
        const r = await client.query(toPgSql(sql), params as unknown[]);
        return { changes: r.rowCount ?? 0 };
      },
    });
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * PostgreSQL returns native JS booleans. For backward compatibility with code
 * that checks `value === 1`, we normalise to boolean.
 */
export function toBool(value: number | boolean | null | undefined): boolean {
  if (typeof value === "boolean") return value;
  return value === 1;
}

export function fromBool(value: boolean): boolean {
  // pg handles JS booleans natively; no need for 0/1 conversion.
  return value;
}

/** Numbers stored as REAL can come back as strings from pg; normalise. */
export function toNumber(value: number | bigint | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") return parseFloat(value) || 0;
  return value;
}

/** @deprecated Not applicable for PostgreSQL – kept for compatibility. */
export function databaseFilePath(): string {
  return process.env.DATABASE_URL ?? "(PostgreSQL)";
}

