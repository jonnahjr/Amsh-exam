const { DatabaseSync } = require('node:sqlite');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// 1. Load environment variables
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const k = trimmed.slice(0, eqIdx).trim();
      const v = trimmed.slice(eqIdx + 1).trim();
      process.env[k] = v;
    }
  }
}

async function migrateSupabase() {
  console.log('--- Migrating Supabase (PostgreSQL) ---');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Drop old constraint
    console.log('Dropping User_role_check constraint...');
    await client.query('ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_role_check"');

    // Update existing users
    console.log('Updating "User" rows from STUDENT to EMPLOYEE...');
    const updateRes = await client.query('UPDATE "User" SET "role" = \'EMPLOYEE\' WHERE "role" = \'STUDENT\'');
    console.log(`Updated ${updateRes.rowCount} rows in "User".`);

    // Update default value
    console.log('Setting default role to EMPLOYEE...');
    await client.query('ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT \'EMPLOYEE\'');

    // Add new constraint
    console.log('Adding new User_role_check constraint with EMPLOYEE...');
    await client.query(`
      ALTER TABLE "User" ADD CONSTRAINT "User_role_check"
      CHECK ("role" IN ('STUDENT', 'EMPLOYEE', 'INSTRUCTOR', 'ADMINISTRATOR'))
    `);

    await client.query('COMMIT');
    console.log('Supabase migration committed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Supabase migration failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

function migrateSqlite() {
  console.log('--- Migrating SQLite (prisma/exam.db) ---');
  const dbPath = path.resolve(__dirname, '../prisma/exam.db');
  if (!fs.existsSync(dbPath)) {
    console.log('No SQLite db file found at', dbPath);
    return;
  }

  const sqliteDb = new DatabaseSync(dbPath);
  try {
    sqliteDb.exec('PRAGMA foreign_keys = OFF;');

    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS "User_new" (
        "id"         TEXT PRIMARY KEY,
        "email"      TEXT NOT NULL UNIQUE,
        "password"   TEXT NOT NULL,
        "name"       TEXT,
        "role"       TEXT NOT NULL DEFAULT 'EMPLOYEE'
                       CHECK ("role" IN ('STUDENT','EMPLOYEE','INSTRUCTOR','ADMINISTRATOR')),
        "createdAt"  TEXT NOT NULL,
        "updatedAt"  TEXT NOT NULL
      );
    `);

    sqliteDb.exec(`
      INSERT INTO "User_new" ("id", "email", "password", "name", "role", "createdAt", "updatedAt")
      SELECT "id", "email", "password", "name",
             CASE WHEN "role" = 'STUDENT' THEN 'EMPLOYEE' ELSE "role" END,
             "createdAt", "updatedAt"
      FROM "User";
    `);

    sqliteDb.exec('DROP TABLE "User";');
    sqliteDb.exec('ALTER TABLE "User_new" RENAME TO "User";');
    sqliteDb.exec('PRAGMA foreign_keys = ON;');

    const countRes = sqliteDb.prepare('SELECT role, count(*) as count FROM "User" GROUP BY role').all();
    console.log('SQLite User roles after migration:', countRes);
    console.log('SQLite migration committed successfully.');
  } finally {
    sqliteDb.close();
  }
}

async function main() {
  await migrateSupabase();
  migrateSqlite();
  console.log('All database migrations completed successfully.');
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
