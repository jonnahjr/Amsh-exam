import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Build a throwaway SQLite database from the real `prisma/schema.sql`.
 *
 * Using the production schema file (rather than a hand-written test schema)
 * means the tests fail if the schema and the application drift apart.
 */
export function useTemporaryDatabase(): { dbPath: string; cleanup: () => void } {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "exam-platform-test-"));
  const dbPath = path.join(directory, "test.db");

  // Set before any module calls getDb().
  process.env.DATABASE_PATH = dbPath;

  const schemaPath = path.join(process.cwd(), "prisma", "schema.sql");
  const sql = fs
    .readFileSync(schemaPath, "utf8")
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");

  // Imported lazily so DATABASE_PATH is already set when the module initialises.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { DatabaseSync } = require("node:sqlite") as typeof import("node:sqlite");
  const db = new DatabaseSync(dbPath);
  try {
    for (const statement of sql.split(";").map((entry) => entry.trim()).filter(Boolean)) {
      db.exec(`${statement};`);
    }
  } finally {
    db.close();
  }

  return {
    dbPath,
    cleanup: () => {
      // Release the cached handle so the next test file gets a fresh one.
      const globalStore = globalThis as unknown as { __examPlatformDb?: { close: () => void } };
      try {
        globalStore.__examPlatformDb?.close();
      } catch {
        // already closed
      }
      globalStore.__examPlatformDb = undefined;
      fs.rmSync(directory, { recursive: true, force: true });
    },
  };
}
