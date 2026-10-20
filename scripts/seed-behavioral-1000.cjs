const { Pool } = require("pg");
const { DatabaseSync } = require("node:sqlite");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

/**
 * Data migration / seed for the Behavioral Competency 100-question exam.
 *
 * The relational schema already supports the whole randomized-examination
 * feature (ExamTemplate.topicWeights, ExamAttempt.selectedQuestionIds,
 * AttemptQuestion, Result). This script adds the missing data: all 1,000
 * authored questions, 16 chapter topics, and one public template configured to
 * draw 100 questions with an equal share per chapter.
 *
 * Usage:
 *   node --env-file=.env scripts/seed-behavioral-1000.cjs
 */

const BANK_DIR = path.resolve(__dirname, "../behavioral-1000");
const BANK_PATH = path.join(BANK_DIR, "behavioral-1000.json");
const CATEGORY_SLUG = "behavioral-competency";
const SUBJECT_SLUG = "bc-workplace-bank";
const SUBJECT_NAME = "Behavioral Competency Workplace Bank";
const TEMPLATE_SLUG = "mock-exam-1";
const TEMPLATE_NAME = "Mock Exam 1";
const TOTAL_QUESTIONS = 100;
const DURATION_MINUTES = 120;
const PASS_THRESHOLD = 70;
const FORCE = process.argv.includes("--force");

const bank = JSON.parse(fs.readFileSync(BANK_PATH, "utf8"));
const questions = bank.questions;
const topics = bank.topics;

function fail(message) {
  throw new Error(message);
}

function validate() {
  if (questions.length !== 1000) fail(`Expected 1000 questions, got ${questions.length}`);
  if (topics.length !== 16) fail(`Expected 16 topics, got ${topics.length}`);

  const numbers = new Set();
  for (const question of questions) {
    if (numbers.has(question.num)) fail(`Duplicate question number ${question.num}`);
    numbers.add(question.num);
    if (!question.text || !question.text.trim()) fail(`Q${question.num} has no text`);
    if (!Array.isArray(question.options) || question.options.length !== 4) {
      fail(`Q${question.num} must have exactly four options`);
    }
    if (question.options.some((option) => !option || !option.trim())) {
      fail(`Q${question.num} has an empty option`);
    }
    if (!Number.isInteger(question.correctIndex) || question.correctIndex < 0 || question.correctIndex > 3) {
      fail(`Q${question.num} has an invalid correctIndex`);
    }
    if (!question.topicSlug) fail(`Q${question.num} has no topicSlug`);
  }

  const topicSlugs = new Set(topics.map((topic) => topic.slug));
  if (topicSlugs.size !== topics.length) fail("Topic slugs are not unique");
  for (const question of questions) {
    if (!topicSlugs.has(question.topicSlug)) fail(`Q${question.num} references an unknown topic`);
  }

  const perTopic = {};
  for (const question of questions) {
    perTopic[question.topicSlug] = (perTopic[question.topicSlug] ?? 0) + 1;
  }
  for (const topic of topics) {
    if ((perTopic[topic.slug] ?? 0) < 7) {
      fail(`Topic ${topic.slug} cannot supply its share of the 100-question paper`);
    }
  }
  return perTopic;
}

/** Stable UUID-shaped ids so re-running the seed updates the same rows. */
function stableId(seed) {
  const hex = crypto.createHash("sha1").update(`bc1000:${seed}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function findAuthor(db, sqlite) {
  if (sqlite) {
    return (
      db.prepare('SELECT id FROM User WHERE email = ?').get("admin@exam.local") ??
      db.prepare("SELECT id FROM User WHERE role = 'ADMINISTRATOR' LIMIT 1").get() ??
      db.prepare("SELECT id FROM User LIMIT 1").get()
    );
  }
  return null;
}

async function seedSqlite(context) {
  const db = new DatabaseSync(path.resolve(__dirname, "../prisma/exam.db"));
  try {
    let authorRow = findAuthor(db, true);
    if (!authorRow) fail("No author user exists in SQLite. Run `npm run db:setup` first.");
    const authorId = authorRow.id;
    const now = new Date().toISOString();

    let categoryRow = db.prepare("SELECT id FROM Category WHERE slug = ?").get(CATEGORY_SLUG);
    let categoryId;
    if (!categoryRow) {
      categoryId = stableId("category");
      db.prepare(
        'INSERT INTO Category (id,slug,name,code,description,subjectCount,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?)',
      ).run(
        categoryId,
        CATEGORY_SLUG,
        "Behavioral Competency",
        "BCC",
        "Behavioral competency, public-sector management, and workplace judgment.",
        1,
        now,
        now,
      );
    } else {
      categoryId = categoryRow.id;
    }

    let subjectRow = db.prepare("SELECT id FROM Subject WHERE slug = ?").get(SUBJECT_SLUG);
    let subjectId;
    if (!subjectRow) {
      subjectId = stableId("subject");
      db.prepare(
        'INSERT INTO Subject (id,slug,name,categoryId,createdAt,updatedAt) VALUES (?,?,?,?,?,?)',
      ).run(subjectId, SUBJECT_SLUG, SUBJECT_NAME, categoryId, now, now);
    } else {
      subjectId = subjectRow.id;
      db.prepare("UPDATE Subject SET name = ?, categoryId = ?, updatedAt = ? WHERE id = ?").run(
        SUBJECT_NAME,
        categoryId,
        now,
        subjectId,
      );
    }

    const topicIds = {};
    for (const topic of topics) {
      const topicId = stableId(`topic:${topic.slug}`);
      const existing = db.prepare("SELECT id FROM Topic WHERE slug = ?").get(topic.slug);
      if (existing) {
        topicIds[topic.slug] = existing.id;
        db.prepare("UPDATE Topic SET name = ?, subjectId = ?, updatedAt = ? WHERE id = ?").run(
          topic.name,
          subjectId,
          now,
          existing.id,
        );
      } else {
        db.prepare(
          'INSERT INTO Topic (id,slug,name,subjectId,createdAt,updatedAt) VALUES (?,?,?,?,?,?)',
        ).run(topicId, topic.slug, topic.name, subjectId, now, now);
        topicIds[topic.slug] = topicId;
      }
    }

    // Rebuild only this bank's questions; other exams are untouched.
    db.prepare("DELETE FROM Question WHERE subjectId = ?").run(subjectId);

    const insert = db.prepare(`
      INSERT INTO Question (
        id, questionId, questionText, categoryId, subjectId, topicId, difficulty, questionType,
        options, correctOptionIndices, explanation, marks, negativeMarks, tags,
        learningObjectives, source, authorId, status, publishedAt, archivedAt,
        importId, canonicalIndices, createdAt, updatedAt
      ) VALUES (?,?,?,?,?,?, 'INTERMEDIATE', 'SINGLE_CHOICE', ?,?,?,1,NULL,?, NULL,?,?, 'PUBLISHED',?,NULL, NULL,'[0,1,2,3]',?,?)
    `);

    // Re-seeding replaces this bank's questions. Refuse once students have
    // attempts, because deleting a question cascades to AttemptQuestion rows.
    const priorTemplate = db.prepare("SELECT id FROM ExamTemplate WHERE slug = ?").get(TEMPLATE_SLUG);
    if (priorTemplate && !FORCE) {
      const attempts = db
        .prepare('SELECT COUNT(*) AS n FROM ExamAttempt WHERE templateId = ?')
        .get(priorTemplate.id).n;
      if (Number(attempts) > 0) {
        fail(
          `Template ${TEMPLATE_SLUG} already has ${attempts} attempt(s). Re-run with --force to replace the bank anyway.`,
        );
      }
    }

    let templateId;
    db.exec("BEGIN");
    try {
      for (const question of questions) {
        const id = stableId(`question:${question.num}`);
        insert.run(
          id,
          `BC1000-${String(question.num).padStart(4, "0")}`,
          question.text,
          categoryId,
          subjectId,
          topicIds[question.topicSlug],
          JSON.stringify(question.options),
          JSON.stringify([question.correctIndex]),
          question.explanation,
          JSON.stringify([question.section, "Behavioral Competency", "1000-bank"]),
          bank.source,
          authorId,
          now,
          now,
          now,
        );
      }

      // Equal share per chapter => a balanced 100-question paper.
      const topicWeights = Object.fromEntries(
        topics.map((topic) => [topicIds[topic.slug], 1]),
      );

      const existingTemplate = db
        .prepare("SELECT id FROM ExamTemplate WHERE slug = ?")
        .get(TEMPLATE_SLUG);
      templateId = existingTemplate ? existingTemplate.id : stableId("template");

      if (existingTemplate) {
        db.prepare(`
          UPDATE ExamTemplate SET
            name = ?, categoryId = ?, subjectId = ?, topicWeights = ?, totalQuestions = ?,
            durationMinutes = ?, marksPerQuestion = 1, negativeMarking = 0,
            difficultyDistribution = '{"INTERMEDIATE":1}', randomizeQuestions = 1, randomizeOptions = 1,
            avoidPreviouslySeen = 0, allowReuse = 0, autoSubmitOnExpiry = 1,
            passThresholdPercent = ?, description = ?, isPublic = 1, publishedAt = ?, updatedAt = ?
          WHERE id = ?
        `).run(
          TEMPLATE_NAME,
          categoryId,
          subjectId,
          JSON.stringify(topicWeights),
          TOTAL_QUESTIONS,
          DURATION_MINUTES,
          PASS_THRESHOLD,
          "",
          now,
          now,
          templateId,
        );
      } else {
        db.prepare(`
          INSERT INTO ExamTemplate (
            id, slug, name, categoryId, subjectId, topicWeights, totalQuestions, durationMinutes,
            marksPerQuestion, negativeMarking, difficultyDistribution, randomizeQuestions,
            randomizeOptions, avoidPreviouslySeen, allowReuse, autoSubmitOnExpiry,
            passThresholdPercent, description, isPublic, publishedAt, createdAt, updatedAt
          ) VALUES (?,?,?,?,?,?,?,?,1,0,'{"INTERMEDIATE":1}',1,1,0,0,1,?,?,1,?,?,?)
        `).run(
          templateId,
          TEMPLATE_SLUG,
          TEMPLATE_NAME,
          categoryId,
          subjectId,
          JSON.stringify(topicWeights),
          TOTAL_QUESTIONS,
          DURATION_MINUTES,
          PASS_THRESHOLD,
          "",
          now,
          now,
          now,
        );
      }
      db.prepare('DELETE FROM DifficultyDistribution WHERE templateId = ?').run(templateId);
      db.prepare(
        'INSERT INTO DifficultyDistribution (id, templateId, difficulty, weight, "order") VALUES (?,?,?,?,?)',
      ).run(stableId("difficulty:INTERMEDIATE"), templateId, "INTERMEDIATE", 1, 0);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }

    context.sqlite = { subjectId, templateId, categoryId, authorId };
    console.log(`SQLite: ${questions.length} questions, ${topics.length} topics, template ${TEMPLATE_SLUG}`);
  } finally {
    db.close();
  }
}

async function seedPostgres(context) {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const authorRes = await pool.query(
      'SELECT id FROM "User" WHERE email = $1',
      ["admin@exam.local"],
    );
    let authorId = authorRes.rows[0]?.id;
    if (!authorId) {
      const fallback = await pool.query(
        'SELECT id FROM "User" WHERE role = \'ADMINISTRATOR\' ORDER BY "createdAt" LIMIT 1',
      );
      authorId = fallback.rows[0]?.id;
    }
    if (!authorId) fail("No author user exists in PostgreSQL. Seed users first.");

    const now = new Date().toISOString();

    let categoryRes = await pool.query('SELECT id FROM "Category" WHERE slug = $1', [CATEGORY_SLUG]);
    let categoryId = categoryRes.rows[0]?.id;
    if (!categoryId) {
      categoryId = stableId("category");
      await pool.query(
        'INSERT INTO "Category" (id,slug,name,code,description,"subjectCount","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
        [
          categoryId,
          CATEGORY_SLUG,
          "Behavioral Competency",
          "BCC",
          "Behavioral competency, public-sector management, and workplace judgment.",
          1,
          now,
          now,
        ],
      );
    }

    let subjectRes = await pool.query('SELECT id FROM "Subject" WHERE slug = $1', [SUBJECT_SLUG]);
    let subjectId = subjectRes.rows[0]?.id;
    if (!subjectId) {
      subjectId = stableId("subject");
      await pool.query(
        'INSERT INTO "Subject" (id,slug,name,"categoryId","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6)',
        [subjectId, SUBJECT_SLUG, SUBJECT_NAME, categoryId, now, now],
      );
    } else {
      await pool.query(
        'UPDATE "Subject" SET name = $1, "categoryId" = $2, "updatedAt" = $3 WHERE id = $4',
        [SUBJECT_NAME, categoryId, now, subjectId],
      );
    }

    const topicIds = {};
    for (const topic of topics) {
      const topicId = stableId(`topic:${topic.slug}`);
      const existing = await pool.query('SELECT id FROM "Topic" WHERE slug = $1', [topic.slug]);
      if (existing.rows[0]) {
        topicIds[topic.slug] = existing.rows[0].id;
        await pool.query(
          'UPDATE "Topic" SET name = $1, "subjectId" = $2, "updatedAt" = $3 WHERE id = $4',
          [topic.name, subjectId, now, existing.rows[0].id],
        );
      } else {
        await pool.query(
          'INSERT INTO "Topic" (id,slug,name,"subjectId","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6)',
          [topicId, topic.slug, topic.name, subjectId, now, now],
        );
        topicIds[topic.slug] = topicId;
      }
    }

    const priorTemplate = await pool.query(
      'SELECT id FROM "ExamTemplate" WHERE slug = $1',
      [TEMPLATE_SLUG],
    );
    if (priorTemplate.rows[0] && !FORCE) {
      const attemptCount = await pool.query(
        'SELECT COUNT(*)::int AS n FROM "ExamAttempt" WHERE "templateId" = $1',
        [priorTemplate.rows[0].id],
      );
      if (attemptCount.rows[0].n > 0) {
        fail(
          `Template ${TEMPLATE_SLUG} already has ${attemptCount.rows[0].n} attempt(s). Re-run with --force to replace the bank anyway.`,
        );
      }
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query('DELETE FROM "Question" WHERE "subjectId" = $1', [subjectId]);

      const insertSql = `
        INSERT INTO "Question" (
          id, "questionId", "questionText", "categoryId", "subjectId", "topicId", difficulty, "questionType",
          options, "correctOptionIndices", explanation, marks, "negativeMarks", tags,
          "learningObjectives", source, "authorId", status, "publishedAt", "archivedAt",
          "importId", "canonicalIndices", "createdAt", "updatedAt"
        ) VALUES (
          $1,$2,$3,$4,$5,$6,'INTERMEDIATE','SINGLE_CHOICE',
          $7,$8,$9,1,NULL,$10,
          NULL,$11,$12,'PUBLISHED',$13,NULL,
          NULL,'[0,1,2,3]',$14,$15
        )`;

      for (const question of questions) {
        await client.query(insertSql, [
          stableId(`question:${question.num}`),
          `BC1000-${String(question.num).padStart(4, "0")}`,
          question.text,
          categoryId,
          subjectId,
          topicIds[question.topicSlug],
          JSON.stringify(question.options),
          JSON.stringify([question.correctIndex]),
          question.explanation,
          JSON.stringify([question.section, "Behavioral Competency", "1000-bank"]),
          bank.source,
          authorId,
          now,
          now,
          now,
        ]);
      }

      const topicWeights = Object.fromEntries(
        topics.map((topic) => [topicIds[topic.slug], 1]),
      );

      const existingTemplate = await client.query(
        'SELECT id FROM "ExamTemplate" WHERE slug = $1',
        [TEMPLATE_SLUG],
      );
      const templateId = existingTemplate.rows[0]?.id ?? stableId("template");

      if (existingTemplate.rows[0]) {
        await client.query(`
          UPDATE "ExamTemplate" SET
            name = $1, "categoryId" = $2, "subjectId" = $3, "topicWeights" = $4,
            "totalQuestions" = $5, "durationMinutes" = $6, "marksPerQuestion" = 1,
            "negativeMarking" = false, "difficultyDistribution" = '{"INTERMEDIATE":1}',
            "randomizeQuestions" = true, "randomizeOptions" = true,
            "avoidPreviouslySeen" = false, "allowReuse" = false, "autoSubmitOnExpiry" = true,
            "passThresholdPercent" = $7, description = $8, "isPublic" = true,
            "publishedAt" = $9, "updatedAt" = $10
          WHERE id = $11
        `, [
          TEMPLATE_NAME,
          categoryId,
          subjectId,
          JSON.stringify(topicWeights),
          TOTAL_QUESTIONS,
          DURATION_MINUTES,
          PASS_THRESHOLD,
          "",
          now,
          now,
          templateId,
        ]);
      } else {
        await client.query(`
          INSERT INTO "ExamTemplate" (
            id, slug, name, "categoryId", "subjectId", "topicWeights", "totalQuestions", "durationMinutes",
            "marksPerQuestion", "negativeMarking", "difficultyDistribution", "randomizeQuestions",
            "randomizeOptions", "avoidPreviouslySeen", "allowReuse", "autoSubmitOnExpiry",
            "passThresholdPercent", description, "isPublic", "publishedAt", "createdAt", "updatedAt"
          ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,
            1,false,'{"INTERMEDIATE":1}',true,
            true,false,false,true,
            $9,$10,true,$11,$12,$13
          )
        `, [
          templateId,
          TEMPLATE_SLUG,
          TEMPLATE_NAME,
          categoryId,
          subjectId,
          JSON.stringify(topicWeights),
          TOTAL_QUESTIONS,
          DURATION_MINUTES,
          PASS_THRESHOLD,
          "",
          now,
          now,
          now,
        ]);
      }

      await client.query('DELETE FROM "DifficultyDistribution" WHERE "templateId" = $1', [templateId]);
      await client.query(
        'INSERT INTO "DifficultyDistribution" (id,"templateId",difficulty,weight,"order") VALUES ($1,$2,$3,$4,$5)',
        [stableId("difficulty:INTERMEDIATE"), templateId, "INTERMEDIATE", 1, 0],
      );
      await client.query("COMMIT");
      context.postgres = { subjectId, templateId, categoryId, authorId };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    console.log(`PostgreSQL: ${questions.length} questions, ${topics.length} topics, template ${TEMPLATE_SLUG}`);
  } finally {
    await pool.end();
  }
}

async function main() {
  const perTopic = validate();
  console.log(`Validated ${questions.length} questions across ${topics.length} topics.`);
  console.log(
    "Chapter sizes: " +
      topics.map((topic) => `${topic.code}:${perTopic[topic.slug]}`).join(", "),
  );

  const context = {};
  await seedSqlite(context);
  if (process.env.DATABASE_URL) {
    await seedPostgres(context);
  } else {
    console.log("DATABASE_URL is not set; skipped PostgreSQL.");
  }

  console.log("\nDone.");
  console.log(`Exam slug: ${TEMPLATE_SLUG}`);
  console.log(`Exam size: ${TOTAL_QUESTIONS} questions, ${DURATION_MINUTES} minutes, pass ${PASS_THRESHOLD}%`);
  console.log("Topic weights: equal across all 16 chapters");
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
