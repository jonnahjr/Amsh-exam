import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Test-only replacement for `@/lib/db`, which talks to PostgreSQL in
 * production. The integration tests need a real relational database with the
 * production schema, and SQLite is the schema this project ships. Jest mocks
 * the db module with this file so attempt/security tests run offline.
 */

const directory = fs.mkdtempSync(path.join(os.tmpdir(), "exam-platform-test-"));
const dbPath = path.join(directory, "test.db");

process.env.DATABASE_PATH = dbPath;

const schemaPath = path.join(process.cwd(), "prisma", "schema.sql");
const schema = fs
  .readFileSync(schemaPath, "utf8")
  .split(/\r?\n/)
  .filter((line) => !line.trim().startsWith("--"))
  .join("\n");

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { DatabaseSync } = require("node:sqlite") as typeof import("node:sqlite");
const db = new DatabaseSync(dbPath);

try {
  for (const statement of schema.split(";").map((entry) => entry.trim()).filter(Boolean)) {
    db.exec(`${statement};`);
  }
} catch (error) {
  db.close();
  throw error;
}

export type Params = (string | number | boolean | null | undefined)[];

function normalise(params: Params = []): (string | number | null)[] {
  return params.map((value) => {
    if (value === undefined || value === null) return null;
    if (typeof value === "boolean") return value ? 1 : 0;
    return value;
  });
}

export async function all<T>(sql: string, params: Params = []): Promise<T[]> {
  return db.prepare(sql).all(...normalise(params)) as T[];
}

export async function one<T>(sql: string, params: Params = []): Promise<T | undefined> {
  return db.prepare(sql).get(...normalise(params)) as T | undefined;
}

export async function run(sql: string, params: Params = []): Promise<{ changes: number }> {
  const result = db.prepare(sql).run(...normalise(params));
  return { changes: Number(result.changes) };
}

export async function transaction<T>(
  fn: (q: {
    all: <R>(sql: string, params?: Params) => Promise<R[]>;
    one: <R>(sql: string, params?: Params) => Promise<R | undefined>;
    run: (sql: string, params?: Params) => Promise<{ changes: number }>;
  }) => Promise<T>,
): Promise<T> {
  db.exec("BEGIN");
  try {
    const result = await fn({ all, one, run });
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function toBool(value: number | boolean | null | undefined): boolean {
  if (typeof value === "boolean") return value;
  return value === 1;
}

export function fromBool(value: boolean): number {
  return value ? 1 : 0;
}

export function toNumber(value: number | bigint | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") return parseFloat(value) || 0;
  return value;
}

export function databaseFilePath(): string {
  return dbPath;
}

export function closeTestDatabase(): void {
  try {
    db.close();
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}
