const { DatabaseSync } = require('node:sqlite');
const { Pool } = require('pg');
const path = require('node:path');

const sqliteDb = new DatabaseSync(path.resolve(__dirname, '../prisma/exam.db'));
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const tables = [
  'User',
  'Category',
  'Subject',
  'Topic',
  'Tag',
  'Question',
  'QuestionTag',
  'QuestionMark',
  'ExamTemplate',
  'DifficultyDistribution',
  'ExamAttempt',
  'AttemptQuestion',
  'Result',
  'ImportJob',
  'AuditLog',
  'CheckIn'
];

async function compare() {
  console.log('Comparing SQLite vs Supabase row counts:');
  for (const table of tables) {
    let sqliteCount = 0;
    try {
      const row = sqliteDb.prepare(`SELECT COUNT(*) as count FROM "${table}"`).get();
      sqliteCount = row ? row.count : 0;
    } catch (e) {
      sqliteCount = 'error: ' + e.message;
    }

    let pgCount = 0;
    try {
      const res = await pool.query(`SELECT COUNT(*) as count FROM "${table}"`);
      pgCount = res.rows[0].count;
    } catch (e) {
      pgCount = 'error: ' + e.message;
    }

    console.log(`- ${table.padEnd(25)} SQLite: ${String(sqliteCount).padEnd(6)} | Supabase: ${pgCount}`);
  }
  await pool.end();
  sqliteDb.close();
}

compare().catch(console.error);
