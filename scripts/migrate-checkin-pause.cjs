/**
 * Adds the `ipAddress` column (and lookup index) to "CheckIn" on every database
 * this project uses, so admins can pause a candidate by name, device, and
 * account. Safe to run repeatedly.
 *
 *   node --env-file=.env scripts/migrate-checkin-pause.cjs
 */
const { DatabaseSync } = require('node:sqlite');
const { Pool } = require('pg');
const path = require('node:path');
const fs = require('node:fs');

async function migratePostgres() {
  if (!process.env.DATABASE_URL) {
    console.log('[PG] DATABASE_URL not set; skipped PostgreSQL.');
    return;
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await pool.query('ALTER TABLE "CheckIn" ADD COLUMN IF NOT EXISTS "ipAddress" TEXT');
    await pool.query('CREATE INDEX IF NOT EXISTS "idx_checkin_ip" ON "CheckIn"("ipAddress")');
    const check = await pool.query(
      `SELECT column_name FROM information_schema.columns
        WHERE table_name = 'CheckIn' AND column_name = 'ipAddress'`,
    );
    console.log(`[PG] CheckIn.ipAddress present: ${check.rowCount === 1}`);
  } finally {
    await pool.end();
  }
}

function migrateSqlite(dbPath) {
  if (!fs.existsSync(dbPath) || fs.statSync(dbPath).size === 0) return;

  const db = new DatabaseSync(dbPath);
  try {
    const hasTable = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'CheckIn'")
      .get();
    if (!hasTable) {
      console.log(`[SQLite] No CheckIn table in ${dbPath}; skipped.`);
      return;
    }

    const columns = db.prepare('PRAGMA table_info("CheckIn")').all();
    if (!columns.some((column) => column.name === 'ipAddress')) {
      db.exec('ALTER TABLE "CheckIn" ADD COLUMN "ipAddress" TEXT');
    }
    db.exec('CREATE INDEX IF NOT EXISTS "idx_checkin_ip" ON "CheckIn"("ipAddress")');
    console.log(`[SQLite] CheckIn.ipAddress present in ${dbPath}`);
  } finally {
    db.close();
  }
}

(async () => {
  await migratePostgres();
  migrateSqlite(path.resolve(__dirname, '../prisma/exam.db'));
  migrateSqlite(path.resolve(__dirname, '../exam.db'));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
