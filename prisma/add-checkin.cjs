// Migration: add CheckIn table
const { DatabaseSync } = require("node:sqlite");
const path = require("node:path");

const dbPath = path.resolve(__dirname, "exam.db");
const db = new DatabaseSync(dbPath);
db.exec("PRAGMA foreign_keys = ON;");
db.exec("PRAGMA journal_mode = WAL;");

db.exec(`
  CREATE TABLE IF NOT EXISTS "CheckIn" (
    "id"           TEXT PRIMARY KEY,
    "employeeName" TEXT NOT NULL,
    "status"       TEXT NOT NULL DEFAULT 'PENDING',
    "checkedInAt"  TEXT NOT NULL,
    "approvedAt"   TEXT,
    "approvedBy"   TEXT,
    "sessionToken" TEXT,
    "notes"        TEXT
  )
`);

console.log("CheckIn table created (or already exists).");
db.close();
