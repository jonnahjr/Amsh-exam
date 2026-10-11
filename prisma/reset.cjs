/**
 * `npm run db:reset`
 *
 * DESTRUCTIVE. Deletes the SQLite database file (and any WAL/journal siblings),
 * recreates the schema, and re-seeds demo content.
 *
 * Requires --force so it can never run by accident in a scripted pipeline.
 */
"use strict";

const { spawnSync } = require("node:child_process");
const path = require("node:path");
const { removeDatabaseFiles, databasePath, ROOT } = require("./_shared.cjs");

const force = process.argv.includes("--force");

if (!force) {
  console.error("db:reset deletes the entire database, including all users and results.");
  console.error(`Target: ${databasePath()}`);
  console.error("\nRe-run with: npm run db:reset -- --force");
  process.exitCode = 1;
} else {
  const { dbPath, removed } = removeDatabaseFiles();
  console.log(`Removed ${removed} file(s) for ${dbPath}`);

  for (const script of ["init-db.cjs", "seed.cjs"]) {
    const result = spawnSync(process.execPath, [path.join(__dirname, script)], {
      cwd: ROOT,
      stdio: "inherit",
    });
    if (result.status !== 0) {
      console.error(`\n${script} failed with exit code ${result.status}.`);
      process.exit(result.status ?? 1);
    }
  }

  console.log("\nDatabase reset complete.");
}
