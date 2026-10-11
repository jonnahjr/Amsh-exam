import fs from "node:fs";
import path from "node:path";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";

/**
 * SQLite access layer built on Node's built-in `node:sqlite`.
 *
 * There is no ORM in this project. Every query is written explicitly and the
 * helpers below keep the call sites short and fully typed.
 */

export type Params = SQLInputValue[];

function resolveDatabasePath(): string {
  const configured = process.env.DATABASE_PATH ?? "./prisma/exam.db";
  return path.isAbsolute(configured)
    ? configured
    : path.resolve(process.cwd(), configured);
}

// Next.js dev mode re-evaluates modules on every hot reload. Caching the
// connection on globalThis keeps a single handle (and a single WAL lock)
// per server process.
declare global {
  // eslint-disable-next-line no-var
  var __examPlatformDb: DatabaseSync | undefined;
  // eslint-disable-next-line no-var
  var __examPlatformDbPath: string | undefined;
}

export function getDb(): DatabaseSync {
  const dbPath = resolveDatabasePath();

  if (globalThis.__examPlatformDb && globalThis.__examPlatformDbPath === dbPath) {
    return globalThis.__examPlatformDb;
  }

  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA busy_timeout = 5000;");

  const schemaReady = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'User'")
    .get();

  if (!schemaReady) {
    db.close();
    throw new Error(
      `The database at ${dbPath} has no schema.\n` +
        "Run `npm run db:setup` (or `npm run db:create`) first, then try again.",
    );
  }

  globalThis.__examPlatformDb = db;
  globalThis.__examPlatformDbPath = dbPath;
  return db;
}

/** Run a query and return every row. */
export function all<T>(sql: string, params: Params = []): T[] {
  const rows = getDb().prepare(sql).all(...params);
  return rows.map((r) => ({ ...(r as Record<string, unknown>) })) as T[];
}

/** Run a query and return the first row, or undefined. */
export function one<T>(sql: string, params: Params = []): T | undefined {
  const row = getDb().prepare(sql).get(...params);
  if (!row) return undefined;
  return { ...(row as Record<string, unknown>) } as T;
}

/** Run a statement and return the number of affected rows. */
export function run(sql: string, params: Params = []): { changes: number } {
  const result = getDb().prepare(sql).run(...params);
  return { changes: Number(result.changes) };
}

/**
 * Run `fn` inside a transaction. Rolled back if `fn` throws.
 *
 * SQLite has no nested transactions, so this is intentionally not composable.
 */
export function transaction<T>(fn: () => T): T {
  const db = getDb();
  db.exec("BEGIN");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

/** SQLite has no boolean type: booleans round-trip as 0/1. */
export function toBool(value: number | null | undefined): boolean {
  return value === 1;
}

export function fromBool(value: boolean): number {
  return value ? 1 : 0;
}

/** Numbers stored as REAL can come back as integers; normalise to number. */
export function toNumber(value: number | bigint | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return typeof value === "bigint" ? Number(value) : value;
}

export function databaseFilePath(): string {
  return resolveDatabasePath();
}
