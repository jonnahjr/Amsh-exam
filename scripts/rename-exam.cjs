const { DatabaseSync } = require('node:sqlite');
const { Pool } = require('pg');
const path = require('node:path');

async function updateName() {
  const newName = 'Accountant III exam';
  const slug = 'account-exam-ii';
  const now = new Date().toISOString();

  // 1. SQLite
  const sqliteDb = new DatabaseSync(path.resolve(__dirname, '../prisma/exam.db'));
  const examRes = sqliteDb.prepare('UPDATE ExamTemplate SET name = ?, updatedAt = ? WHERE slug = ?').run(newName, now, slug);
  const subRes = sqliteDb.prepare('UPDATE Subject SET name = ?, updatedAt = ? WHERE slug = ?').run(newName, now, slug);
  console.log(`SQLite: updated ExamTemplate (${examRes.changes} changes), Subject (${subRes.changes} changes).`);

  // 2. Supabase PostgreSQL
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const pgExam = await pool.query('UPDATE "ExamTemplate" SET name = $1, "updatedAt" = $2 WHERE slug = $3', [newName, now, slug]);
    const pgSub = await pool.query('UPDATE "Subject" SET name = $1, "updatedAt" = $2 WHERE slug = $3', [newName, now, slug]);
    console.log(`Supabase: updated ExamTemplate (${pgExam.rowCount} rows), Subject (${pgSub.rowCount} rows).`);
  } finally {
    await pool.end();
  }
}

updateName().catch((err) => {
  console.error('Error updating name:', err);
  process.exit(1);
});
