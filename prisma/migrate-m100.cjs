/**
 * Database migration for M100 Employee Codes.
 * Updates both SQLite (prisma/exam.db) and PostgreSQL (if DATABASE_URL is set).
 */

const fs = require('node:fs');
const path = require('node:path');

// 1. SQLite
try {
  const { DatabaseSync } = require('node:sqlite');
  const dbPath = path.join(__dirname, 'exam.db');
  if (fs.existsSync(dbPath)) {
    const db = new DatabaseSync(dbPath);
    console.log('[SQLite] Applying M100 migration to exam.db...');

    // Alter User if column not exists
    const userCols = db.prepare('PRAGMA table_info(User)').all().map(c => c.name);
    if (!userCols.includes('m100Code')) {
      db.exec('ALTER TABLE "User" ADD COLUMN "m100Code" TEXT;');
      console.log('[SQLite] Added m100Code to User table.');
    }

    // Alter CheckIn if column not exists
    const checkinCols = db.prepare('PRAGMA table_info(CheckIn)').all().map(c => c.name);
    if (!checkinCols.includes('m100Code')) {
      db.exec('ALTER TABLE "CheckIn" ADD COLUMN "m100Code" TEXT;');
      console.log('[SQLite] Added m100Code to CheckIn table.');
    }

    // Create AuthorizedM100Code table
    db.exec(`
      CREATE TABLE IF NOT EXISTS "AuthorizedM100Code" (
        "id"           TEXT PRIMARY KEY,
        "code"         TEXT UNIQUE NOT NULL,
        "employeeName" TEXT,
        "department"   TEXT,
        "isActive"     INTEGER NOT NULL DEFAULT 1,
        "isUsed"       INTEGER NOT NULL DEFAULT 0,
        "usedByUserId" TEXT,
        "usedAt"       TEXT,
        "createdAt"    TEXT NOT NULL,
        "updatedAt"    TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS "idx_m100_code" ON "AuthorizedM100Code"("code");
    `);
    console.log('[SQLite] AuthorizedM100Code table ready.');

    // Update existing M100-AMSH-001 code to AMSH-M1
    db.exec(`
      UPDATE "AuthorizedM100Code" SET "code" = 'AMSH-M1' WHERE "code" = 'M100-AMSH-001';
      UPDATE "User" SET "m100Code" = 'AMSH-M1' WHERE "m100Code" = 'M100-AMSH-001';
      UPDATE "CheckIn" SET "m100Code" = 'AMSH-M1' WHERE "m100Code" = 'M100-AMSH-001';
    `);

    // Seed default employee test codes
    const seedCodes = [
      { id: 'm100-seed-001', code: 'AMSH-M1', name: 'Yonas Bogale', dept: 'Engineering', active: 1, used: 0 },
      { id: 'm100-seed-002', code: 'M100-AMSH-002', name: 'Bethelhem Tadesse', dept: 'Finance', active: 1, used: 0 },
      { id: 'm100-seed-003', code: 'M100-AMSH-003', name: 'Dawit Mengistu', dept: 'Operations', active: 1, used: 0 },
      { id: 'm100-seed-004', code: 'M100-DEMO-2026', name: 'Demo Candidate', dept: 'General', active: 1, used: 0 },
      { id: 'm100-seed-005', code: 'M100-ALPHA-101', name: 'Alpha Tester', dept: 'Quality Assurance', active: 1, used: 0 },
      { id: 'm100-seed-006', code: 'M100-BETA-202', name: 'Beta Candidate', dept: 'Support', active: 1, used: 0 },
      { id: 'm100-seed-007', code: 'M100-INACTIVE-999', name: 'Inactive Employee', dept: 'Former', active: 0, used: 0 },
      { id: 'm100-seed-008', code: 'M100-USED-777', name: 'Already Claimed', dept: 'Legacy', active: 1, used: 1, usedBy: 'f5ceb895-ab1a-4a7f-917e-6b9eb227e7c6' }
    ];

    const now = new Date().toISOString();
    const insertStmt = db.prepare(`
      INSERT OR IGNORE INTO "AuthorizedM100Code" 
      ("id", "code", "employeeName", "department", "isActive", "isUsed", "usedByUserId", "usedAt", "createdAt", "updatedAt")
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const c of seedCodes) {
      insertStmt.run(
        c.id, c.code, c.name, c.dept, c.active, c.used,
        c.usedBy || null, c.used ? now : null, now, now
      );
    }
    console.log('[SQLite] Seeded authorized codes (AMSH-M1 active).');
  }
} catch (err) {
  console.error('[SQLite] Error applying migration:', err.message);
}

// 2. PostgreSQL (if DATABASE_URL is set in .env)
async function migratePg() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/DATABASE_URL="?([^"\r\n]+)"?/);
  if (!match || !match[1] || match[1].includes('your-postgres')) {
    console.log('[PostgreSQL] No valid DATABASE_URL found in .env, skipping PG migration.');
    return;
  }

  const { Pool } = require('pg');
  const sanitizedUrl = match[1]
    .replace(/([?&])sslmode=[^&]+(&?)/, (_, p1, p2) => (p1 === '?' && p2 ? '?' : ''))
    .replace(/\?$/, '');

  const pool = new Pool({
    connectionString: sanitizedUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    console.log('[PostgreSQL] Applying M100 migration to Supabase/PostgreSQL...');
    await pool.query(`
      ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "m100Code" TEXT;
      ALTER TABLE "CheckIn" ADD COLUMN IF NOT EXISTS "m100Code" TEXT;
      CREATE TABLE IF NOT EXISTS "AuthorizedM100Code" (
        "id"           TEXT PRIMARY KEY,
        "code"         TEXT UNIQUE NOT NULL,
        "employeeName" TEXT,
        "department"   TEXT,
        "isActive"     BOOLEAN NOT NULL DEFAULT true,
        "isUsed"       BOOLEAN NOT NULL DEFAULT false,
        "usedByUserId" TEXT,
        "usedAt"       TEXT,
        "createdAt"    TEXT NOT NULL,
        "updatedAt"    TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS "idx_m100_code" ON "AuthorizedM100Code"("code");
    `);

    // Update existing M100-AMSH-001 to AMSH-M1 in PostgreSQL
    await pool.query(`
      UPDATE "AuthorizedM100Code" SET "code" = 'AMSH-M1' WHERE "code" = 'M100-AMSH-001';
      UPDATE "User" SET "m100Code" = 'AMSH-M1' WHERE "m100Code" = 'M100-AMSH-001';
      UPDATE "CheckIn" SET "m100Code" = 'AMSH-M1' WHERE "m100Code" = 'M100-AMSH-001';
    `);

    const now = new Date().toISOString();
    const seedCodes = [
      ['m100-seed-001', 'AMSH-M1', 'Yonas Bogale', 'Engineering', true, false, null, null, now, now],
      ['m100-seed-002', 'M100-AMSH-002', 'Bethelhem Tadesse', 'Finance', true, false, null, null, now, now],
      ['m100-seed-003', 'M100-AMSH-003', 'Dawit Mengistu', 'Operations', true, false, null, null, now, now],
      ['m100-seed-004', 'M100-DEMO-2026', 'Demo Candidate', 'General', true, false, null, null, now, now],
      ['m100-seed-005', 'M100-ALPHA-101', 'Alpha Tester', 'Quality Assurance', true, false, null, null, now, now],
      ['m100-seed-006', 'M100-BETA-202', 'Beta Candidate', 'Support', true, false, null, null, now, now],
      ['m100-seed-007', 'M100-INACTIVE-999', 'Inactive Employee', 'Former', false, false, null, null, now, now],
      ['m100-seed-008', 'M100-USED-777', 'Already Claimed', 'Legacy', true, true, 'f5ceb895-ab1a-4a7f-917e-6b9eb227e7c6', now, now, now]
    ];

    for (const c of seedCodes) {
      await pool.query(`
        INSERT INTO "AuthorizedM100Code" 
        ("id", "code", "employeeName", "department", "isActive", "isUsed", "usedByUserId", "usedAt", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT ("code") DO NOTHING
      `, c);
    }
    console.log('[PostgreSQL] Migration completed successfully.');
  } catch (err) {
    console.error('[PostgreSQL] Migration error:', err.message);
  } finally {
    await pool.end();
  }
}

migratePg();
