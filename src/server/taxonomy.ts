import { all, one } from "@/lib/db";
import type { CategoryRow, SubjectRow, SubjectWithCategory, TopicRow } from "@/types";

/** Taxonomy reads. All rows are small enough to load without pagination. */

export async function listCategories(): Promise<CategoryRow[]> {
  return all<CategoryRow>('SELECT * FROM "Category" ORDER BY "name"');
}

export async function findCategoryBySlug(slug: string): Promise<CategoryRow | null> {
  return (await one<CategoryRow>('SELECT * FROM "Category" WHERE "slug" = ?', [slug])) ?? null;
}

export async function findCategoryById(id: string): Promise<CategoryRow | null> {
  return (await one<CategoryRow>('SELECT * FROM "Category" WHERE "id" = ?', [id])) ?? null;
}

export async function listSubjects(): Promise<SubjectWithCategory[]> {
  return all<SubjectWithCategory>(`
    SELECT s.*, c."name" AS "categoryName", c."slug" AS "categorySlug"
    FROM "Subject" s
    JOIN "Category" c ON c."id" = s."categoryId"
    ORDER BY c."name", s."name"
  `);
}

export async function listSubjectsByCategory(categoryId: string): Promise<SubjectRow[]> {
  return all<SubjectRow>(
    'SELECT * FROM "Subject" WHERE "categoryId" = ? ORDER BY "name"',
    [categoryId],
  );
}

export async function findSubjectBySlug(slug: string): Promise<SubjectRow | null> {
  return (await one<SubjectRow>('SELECT * FROM "Subject" WHERE "slug" = ?', [slug])) ?? null;
}

export async function findSubjectById(id: string): Promise<SubjectRow | null> {
  return (await one<SubjectRow>('SELECT * FROM "Subject" WHERE "id" = ?', [id])) ?? null;
}

export async function listTopics(): Promise<TopicRow[]> {
  return all<TopicRow>('SELECT * FROM "Topic" ORDER BY "name"');
}

export async function findTopicBySlug(slug: string): Promise<TopicRow | null> {
  return (await one<TopicRow>('SELECT * FROM "Topic" WHERE "slug" = ?', [slug])) ?? null;
}

export async function listTopicsBySubject(subjectId: string): Promise<TopicRow[]> {
  return all<TopicRow>('SELECT * FROM "Topic" WHERE "subjectId" = ? ORDER BY "name"', [subjectId]);
}

export async function countTopicsBySubject(subjectId: string): Promise<number> {
  const row = await one<{ n: string }>('SELECT COUNT(*) AS "n" FROM "Topic" WHERE "subjectId" = ?', [subjectId]);
  return Number(row?.n ?? 0);
}

/** Maps for turning ids into display names on list pages. */
export interface TaxonomyLookup {
  categoryNames: Map<string, string>;
  subjectNames: Map<string, string>;
  topicNames: Map<string, string>;
}

export async function taxonomyLookup(): Promise<TaxonomyLookup> {
  const [cats, subs, tops] = await Promise.all([listCategories(), listSubjects(), listTopics()]);
  return {
    categoryNames: new Map(cats.map((row) => [row.id, row.name])),
    subjectNames: new Map(subs.map((row) => [row.id, row.name])),
    topicNames: new Map(tops.map((row) => [row.id, row.name])),
  };
}