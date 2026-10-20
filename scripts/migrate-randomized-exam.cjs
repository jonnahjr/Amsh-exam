const { Pool } = require("pg");
const { DatabaseSync } = require("node:sqlite");
const path = require("node:path");

/**
 * `node --env-file=.env scripts/migrate-randomized-exam.cjs`
 *
 * The randomized-examination feature uses columns that already exist in the
 * schema. This migration only adds the composite indexes used by the hot paths:
 *   - load the published pool for one subject when an attempt starts
 *   - find or resume a student's active attempt for one template
 *
 * Both statements are idempotent and safe to run repeatedly.
 */

const STATEMENTS = [
  'CREATE INDEX IF NOT EXISTS "Question_status_subjectId_idx" ON "Question"("status","subjectId")',
  'CREATE INDEX IF NOT EXISTS "ExamAttempt_user_template_status_idx" ON "ExamAttempt"("userId","templateId","status")',
];

function migrateSqlite() {
  const db = new DatabaseSync(path.resolve(__dirname, "../prisma/exam.db"));
  try {
    db.exec("BEGIN");
    try {
      for (const statement of STATEMENTS) db.exec(`${statement};`);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
    console.log(`SQLite: applied ${STATEMENTS.length} index statements.`);
  } finally {
    db.close();
  }
}

async function migratePostgres() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  try {
    for (const statement of STATEMENTS) await pool.query(statement);
    console.log(`PostgreSQL: applied ${STATEMENTS.length} index statements.`);
  } finally {
    await pool.end();
  }
}

(async () => {
  migrateSqlite();
  if (process.env.DATABASE_URL) {
    await migratePostgres();
  } else {
    console.log("DATABASE_URL is not set; skipped PostgreSQL.");
  }
  console.log("Randomized-exam indexes are up to date.");
})().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
