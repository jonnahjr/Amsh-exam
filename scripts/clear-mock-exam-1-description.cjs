const { Pool } = require('pg');
const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');

async function main() {
  console.log("Removing description from Mock Exam 1 in Supabase and SQLite...");

  // Supabase PostgreSQL
  if (process.env.DATABASE_URL) {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    try {
      const before = await pool.query('SELECT slug, name, description FROM "ExamTemplate" WHERE slug = $1', ['mock-exam-1']);
      console.log("[PG] Before:", before.rows[0]);

      const res = await pool.query('UPDATE "ExamTemplate" SET description = NULL, "updatedAt" = $1 WHERE slug = $2', [
        new Date().toISOString(),
        'mock-exam-1'
      ]);
      console.log(`[PG] Updated ${res.rowCount} row(s).`);

      const after = await pool.query('SELECT slug, name, description FROM "ExamTemplate" WHERE slug = $1', ['mock-exam-1']);
      console.log("[PG] After:", after.rows[0]);
    } finally {
      await pool.end();
    }
  }

  // SQLite
  const dbPath = path.resolve(__dirname, '../prisma/exam.db');
  const db = new DatabaseSync(dbPath);
  try {
    const before = db.prepare('SELECT slug, name, description FROM ExamTemplate WHERE slug = ?').get('mock-exam-1');
    console.log("[SQLite] Before:", before);

    const res = db.prepare('UPDATE ExamTemplate SET description = NULL, updatedAt = ? WHERE slug = ?').run(
      new Date().toISOString(),
      'mock-exam-1'
    );
    console.log(`[SQLite] Updated ${res.changes} row(s).`);

    const after = db.prepare('SELECT slug, name, description FROM ExamTemplate WHERE slug = ?').get('mock-exam-1');
    console.log("[SQLite] After:", after);
  } finally {
    db.close();
  }
}

main().catch(console.error);
