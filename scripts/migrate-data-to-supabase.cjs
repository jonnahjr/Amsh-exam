const { DatabaseSync } = require('node:sqlite');
const { Pool } = require('pg');
const path = require('node:path');

const sqliteDb = new DatabaseSync(path.resolve(__dirname, '../prisma/exam.db'));
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const booleanColumnsByTable = {
  User: ['isActive'],
  ExamTemplate: ['isPublic', 'negativeMarking', 'randomizeQuestions', 'randomizeOptions', 'avoidPreviouslySeen'],
  AttemptQuestion: ['isAnswered', 'isFlagged', 'isCorrect']
};

async function migrateTable(tableName, client) {
  const rows = sqliteDb.prepare(`SELECT * FROM "${tableName}"`).all();
  if (rows.length === 0) {
    console.log(`[${tableName}] 0 rows to migrate.`);
    return;
  }

  const boolCols = new Set(booleanColumnsByTable[tableName] || []);
  const sampleRow = rows[0];
  const columns = Object.keys(sampleRow);
  const colNames = columns.map(c => `"${c}"`).join(', ');
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
  const sql = `INSERT INTO "${tableName}" (${colNames}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;

  let inserted = 0;
  for (const row of rows) {
    const values = columns.map(c => {
      const val = row[c];
      if (val === null || val === undefined) return null;
      if (boolCols.has(c)) {
        return Boolean(val === 1 || val === true || val === '1' || val === 'true');
      }
      return val;
    });

    try {
      await client.query(sql, values);
      inserted++;
    } catch (err) {
      console.error(`Error inserting into ${tableName} (id: ${row.id || 'N/A'}):`, err.message);
    }
  }

  console.log(`[${tableName}] Migrated ${inserted}/${rows.length} rows.`);
}

async function run() {
  const client = await pool.connect();
  try {
    console.log('--- Starting SQLite -> Supabase Data Migration ---');
    await client.query('BEGIN');

    const orderedTables = [
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

    for (const table of orderedTables) {
      await migrateTable(table, client);
    }

    await client.query('COMMIT');
    console.log('--- Migration Completed Successfully! ---');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed, rolled back:', error);
  } finally {
    client.release();
    await pool.end();
    sqliteDb.close();
  }
}

run();
