const { Pool } = require('pg');
const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

const targetSlugs = [
  'bcc-exam-1-behavioral-competency-core-framework',
  'bcc-exam-2-behavioral-competency-advanced-applications',
  'bcc-exam-3-behavioral-competency-scenario-mastery',
  'full-1'
];

async function cleanPostgreSQL() {
  if (!process.env.DATABASE_URL) {
    console.log('[PG] No DATABASE_URL found. Skipping PostgreSQL cleanup.');
    return;
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  console.log('[PG] Connecting to PostgreSQL (Supabase)...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const slug of targetSlugs) {
      console.log(`\n--- Cleaning target slug: ${slug} ---`);
      // Find template
      const tRes = await client.query('SELECT id, name, "subjectId" FROM "ExamTemplate" WHERE slug = $1', [slug]);
      if (tRes.rows.length === 0) {
        console.log(`Template with slug "${slug}" not found in PostgreSQL.`);
        continue;
      }

      const template = tRes.rows[0];
      const templateId = template.id;
      const subjectId = template.subjectId;
      console.log(`Found template "${template.name}" (${templateId}), subjectId: ${subjectId}`);

      // 1. Delete AttemptQuestion records for attempts of this template
      const delAQ = await client.query(`
        DELETE FROM "AttemptQuestion"
        WHERE "attemptId" IN (SELECT id FROM "ExamAttempt" WHERE "templateId" = $1)
      `, [templateId]);
      console.log(`Deleted ${delAQ.rowCount} AttemptQuestion rows.`);

      // 2. Delete Result records for attempts of this template
      const delR = await client.query(`
        DELETE FROM "Result"
        WHERE "attemptId" IN (SELECT id FROM "ExamAttempt" WHERE "templateId" = $1)
      `, [templateId]);
      console.log(`Deleted ${delR.rowCount} Result rows.`);

      // 3. Delete ExamAttempt records
      const delA = await client.query('DELETE FROM "ExamAttempt" WHERE "templateId" = $1', [templateId]);
      console.log(`Deleted ${delA.rowCount} ExamAttempt rows.`);

      // 4. Delete DifficultyDistribution
      const delDD = await client.query('DELETE FROM "DifficultyDistribution" WHERE "templateId" = $1', [templateId]);
      console.log(`Deleted ${delDD.rowCount} DifficultyDistribution rows.`);

      // 5. Delete ExamTemplate
      const delT = await client.query('DELETE FROM "ExamTemplate" WHERE id = $1', [templateId]);
      console.log(`Deleted ExamTemplate "${slug}".`);

      // 6. Delete questions belonging to subjectId
      if (subjectId) {
        await client.query(`
          DELETE FROM "QuestionTag"
          WHERE "questionId" IN (SELECT id FROM "Question" WHERE "subjectId" = $1)
        `, [subjectId]);

        await client.query(`
          DELETE FROM "QuestionMark"
          WHERE "questionId" IN (SELECT id FROM "Question" WHERE "subjectId" = $1)
        `, [subjectId]);

        const delQ = await client.query('DELETE FROM "Question" WHERE "subjectId" = $1', [subjectId]);
        console.log(`Deleted ${delQ.rowCount} questions belonging to subject ${subjectId}.`);

        // Delete topics under subject
        const delTop = await client.query('DELETE FROM "Topic" WHERE "subjectId" = $1', [subjectId]);
        console.log(`Deleted ${delTop.rowCount} topics belonging to subject ${subjectId}.`);

        // Check if other templates use this subject
        const otherT = await client.query('SELECT id FROM "ExamTemplate" WHERE "subjectId" = $1', [subjectId]);
        if (otherT.rows.length === 0) {
          const delS = await client.query('DELETE FROM "Subject" WHERE id = $1', [subjectId]);
          console.log(`Deleted Subject ${subjectId} (${delS.rowCount} rows).`);
        } else {
          console.log(`Subject ${subjectId} still referenced by ${otherT.rows.length} other templates. Retaining.`);
        }
      }
    }

    await client.query('COMMIT');
    console.log('[PG] PostgreSQL cleanup committed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[PG] Error during PostgreSQL cleanup, rolled back:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

function cleanSQLite() {
  const dbPaths = [
    path.join(__dirname, '..', 'prisma', 'exam.db'),
    path.join(__dirname, '..', 'exam.db')
  ];

  for (const dbPath of dbPaths) {
    if (!fs.existsSync(dbPath)) continue;
    const stat = fs.statSync(dbPath);
    if (stat.size === 0) continue;

    console.log(`\n[SQLite] Cleaning SQLite DB at: ${dbPath}`);
    const db = new DatabaseSync(dbPath);

    try {
      db.exec('PRAGMA foreign_keys = OFF;');
      db.exec('BEGIN');

      for (const slug of targetSlugs) {
        const stmt = db.prepare('SELECT id, name, subjectId FROM ExamTemplate WHERE slug = ?');
        const template = stmt.get(slug);
        if (!template) {
          console.log(`[SQLite] Template with slug "${slug}" not found in SQLite.`);
          continue;
        }

        const templateId = template.id;
        const subjectId = template.subjectId;
        console.log(`[SQLite] Found template "${template.name}" (${templateId}), subjectId: ${subjectId}`);

        // Delete AttemptQuestion
        db.prepare(`
          DELETE FROM AttemptQuestion
          WHERE attemptId IN (SELECT id FROM ExamAttempt WHERE templateId = ?)
        `).run(templateId);

        // Delete Result
        db.prepare(`
          DELETE FROM Result
          WHERE attemptId IN (SELECT id FROM ExamAttempt WHERE templateId = ?)
        `).run(templateId);

        // Delete ExamAttempt
        db.prepare('DELETE FROM ExamAttempt WHERE templateId = ?').run(templateId);

        // Delete DifficultyDistribution
        db.prepare('DELETE FROM DifficultyDistribution WHERE templateId = ?').run(templateId);

        // Delete ExamTemplate
        db.prepare('DELETE FROM ExamTemplate WHERE id = ?').run(templateId);

        // Delete Questions
        if (subjectId) {
          db.prepare(`
            DELETE FROM QuestionTag
            WHERE questionId IN (SELECT id FROM Question WHERE subjectId = ?)
          `).run(subjectId);

          db.prepare(`
            DELETE FROM QuestionMark
            WHERE questionId IN (SELECT id FROM Question WHERE subjectId = ?)
          `).run(subjectId);

          const qDel = db.prepare('DELETE FROM Question WHERE subjectId = ?').run(subjectId);
          console.log(`[SQLite] Deleted ${qDel.changes} questions for subject ${subjectId}`);

          db.prepare('DELETE FROM Topic WHERE subjectId = ?').run(subjectId);

          const otherT = db.prepare('SELECT id FROM ExamTemplate WHERE subjectId = ?').all(subjectId);
          if (otherT.length === 0) {
            db.prepare('DELETE FROM Subject WHERE id = ?').run(subjectId);
            console.log(`[SQLite] Deleted subject ${subjectId}`);
          }
        }
      }

      db.exec('COMMIT');
      db.exec('PRAGMA foreign_keys = ON;');
      console.log(`[SQLite] Cleanup complete for ${dbPath}.`);
    } catch (err) {
      db.exec('ROLLBACK');
      console.error(`[SQLite] Error cleaning ${dbPath}:`, err);
      throw err;
    } finally {
      db.close();
    }
  }
}

async function main() {
  console.log('Target slugs to delete:');
  console.log(targetSlugs);
  await cleanPostgreSQL();
  cleanSQLite();
  console.log('\nAll cleanup complete!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
