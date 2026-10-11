/**
 * Shared helpers for the plain-node database scripts.
 *
 * These run outside Next.js, so they cannot rely on Next's automatic .env
 * loading. A minimal parser keeps the scripts dependency-free.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { DatabaseSync } = require("node:sqlite");

const ROOT = path.resolve(__dirname, "..");

/** Parse a .env file without pulling in a dependency. */
function loadEnv(file = path.join(ROOT, ".env")) {
  if (!fs.existsSync(file)) return;
  for (const rawLine of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnv();

/** Absolute path to the SQLite database file. */
function databasePath() {
  const configured = process.env.DATABASE_PATH || "./prisma/exam.db";
  return path.isAbsolute(configured)
    ? configured
    : path.resolve(ROOT, configured);
}

function schemaPath() {
  return path.join(__dirname, "schema.sql");
}

function readSchema() {
  return fs.readFileSync(schemaPath(), "utf8");
}

/** Open the database, creating the parent directory when needed. */
function openDatabase() {
  const dbPath = databasePath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA foreign_keys = ON;");
  return { db, dbPath };
}

/** Remove the database file plus any WAL/journal siblings. */
function removeDatabaseFiles() {
  const dbPath = databasePath();
  let removed = 0;
  for (const suffix of ["", "-journal", "-wal", "-shm"]) {
    const file = `${dbPath}${suffix}`;
    if (fs.existsSync(file)) {
      fs.rmSync(file, { force: true });
      removed += 1;
    }
  }
  return { dbPath, removed };
}

function newId() {
  return crypto.randomUUID();
}

function now() {
  return new Date().toISOString();
}

/** Split schema.sql into individual statements (comments stripped). */
function schemaStatements(sql) {
  const withoutComments = sql
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
  return withoutComments
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

module.exports = {
  ROOT,
  loadEnv,
  databasePath,
  schemaPath,
  readSchema,
  openDatabase,
  removeDatabaseFiles,
  newId,
  now,
  schemaStatements,
};
