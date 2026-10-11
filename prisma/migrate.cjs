/**
 * `npm run db:migrate`
 *
 * Applies prisma/schema.sql and records a hash of the schema in a
 * `_Migrations` bookkeeping table.
 *
 * Every statement in schema.sql is idempotent (CREATE ... IF NOT EXISTS), so
 * this is safe to run repeatedly. The hash exists so the command can tell you
 * clearly whether it actually changed anything, rather than doing work and
 * staying silent.
 *
 * It does NOT drop or rewrite columns. If you change an existing column's
 * type or constraints, use `npm run db:reset` (destructive) instead.
 */
"use strict";

const crypto = require("node:crypto");
const { openDatabase, readSchema, schemaStatements, now, newId } = require("./_shared.cjs");

const schema = readSchema();
const hash = crypto.createHash("sha256").update(schema).digest("hex");

const { db, dbPath } = openDatabase();

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS "_Migrations" (
      "id"        TEXT PRIMARY KEY,
      "name"      TEXT NOT NULL UNIQUE,
      "hash"      TEXT NOT NULL,
      "appliedAt" TEXT NOT NULL
    );
  `);

  const previous = db
    .prepare('SELECT hash, appliedAt FROM "_Migrations" WHERE name = ?')
    .get("schema.sql");

  if (previous && previous.hash === hash) {
    console.log(`Schema unchanged since ${previous.appliedAt}. Nothing to do.`);
    console.log(dbPath);
    process.exitCode = 0;
  } else {
    const statements = schemaStatements(schema);
    db.exec("BEGIN");
    try {
      for (const statement of statements) {
        db.exec(`${statement};`);
      }
      if (previous) {
        db.prepare('UPDATE "_Migrations" SET hash = ?, "appliedAt" = ? WHERE name = ?').run(
          hash,
          now(),
          "schema.sql",
        );
      } else {
        db.prepare('INSERT INTO "_Migrations" ("id","name","hash","appliedAt") VALUES (?,?,?,?)').run(
          newId(),
          "schema.sql",
          hash,
          now(),
        );
      }
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }

    console.log(previous ? "Schema updated." : "Baseline recorded.");
    console.log(`Applied ${statements.length} statements to ${dbPath}.`);
  }
} catch (error) {
  console.error("Migration failed.");
  console.error(error);
  process.exitCode = 1;
} finally {
  db.close();
}
