const { DatabaseSync } = require('node:sqlite');
const { Pool } = require('pg');
const path = require('node:path');
const fs = require('node:fs');

async function main() {
  const newName = 'Mock Exam 1';
  const newSlug = 'mock-exam-1';
  const oldSlug = 'bc-workplace-100';
  const now = new Date().toISOString();

  console.log(`Updating 100-question randomized exam to title: "${newName}", slug: "${newSlug}"...`);

  // 1. Supabase PostgreSQL
  if (process.env.DATABASE_URL) {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    try {
      const res = await pool.query(`
        UPDATE "ExamTemplate"
        SET name = $1, slug = $2, "updatedAt" = $3
        WHERE slug = $4 OR slug = $2
      `, [newName, newSlug, now, oldSlug]);
      console.log(`[PG] Updated ${res.rowCount} ExamTemplate row(s) in Supabase.`);
    } finally {
      await pool.end();
    }
  }

  // 2. SQLite
  const dbPaths = [
    path.resolve(__dirname, '../prisma/exam.db'),
    path.resolve(__dirname, '../exam.db')
  ];

  for (const dbPath of dbPaths) {
    if (!fs.existsSync(dbPath)) continue;
    const stat = fs.statSync(dbPath);
    if (stat.size === 0) continue;

    const db = new DatabaseSync(dbPath);
    try {
      const stmt = db.prepare(`
        UPDATE ExamTemplate
        SET name = ?, slug = ?, updatedAt = ?
        WHERE slug = ? OR slug = ?
      `);
      const res = stmt.run(newName, newSlug, now, oldSlug, newSlug);
      console.log(`[SQLite] Updated ${res.changes} row(s) in ${dbPath}.`);
    } finally {
      db.close();
    }
  }

  console.log('Update complete!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
