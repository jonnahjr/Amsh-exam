/**
 * `npm run db:create`
 *
 * Creates the SQLite database from prisma/schema.sql. Idempotent: every
 * statement uses IF NOT EXISTS, so running it against an existing database
 * adds anything that is missing without touching existing rows.
 */
"use strict";

const fs = require("node:fs");
const { openDatabase, readSchema, databasePath, schemaStatements } = require("./_shared.cjs");

// Check before opening: opening the database creates the file.
const dbPath = databasePath();
const existed = fs.existsSync(dbPath);
const { db } = openDatabase();

try {
  for (const statement of schemaStatements(readSchema())) {
    db.exec(`${statement};`);
  }

  const tables = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    )
    .all()
    .map((row) => row.name);

  console.log(`${existed ? "Verified" : "Created"} ${dbPath}`);
  console.log(`Tables (${tables.length}): ${tables.join(", ")}`);
  console.log("\nNext: npm run db:seed");
} catch (error) {
  console.error(`Failed to initialize ${dbPath}`);
  console.error(error);
  process.exitCode = 1;
} finally {
  db.close();
}
