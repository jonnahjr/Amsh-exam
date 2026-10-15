const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const templates = await pool.query(`
    SELECT t.id, t.slug, t.name, t."totalQuestions", t."durationMinutes", t."isPublic", s.name as "subjectName"
    FROM "ExamTemplate" t
    LEFT JOIN "Subject" s ON s.id = t."subjectId"
    ORDER BY t.name
  `);
  console.log("Exam Templates in Supabase:");
  for (const t of templates.rows) {
    const qCount = await pool.query('SELECT COUNT(*) as count FROM "Question" WHERE "subjectId" = $1', [t.id]); // wait, question is linked by subjectId
    const subjectQ = await pool.query('SELECT COUNT(*) as count FROM "Question" WHERE "subjectId" = (SELECT "subjectId" FROM "ExamTemplate" WHERE id = $1)', [t.id]);
    console.log(`- [${t.slug}] "${t.name}" -> ${t.totalQuestions} questions, Subject: ${t.subjectName}, Questions in pool: ${subjectQ.rows[0].count}`);
  }
  await pool.end();
}

main().catch(console.error);
