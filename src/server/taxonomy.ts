import { all, one } from "@/lib/db";
import type { CategoryRow, SubjectRow, SubjectWithCategory, TopicRow } from "@/types";

/** Taxonomy reads. All rows are small enough to load without pagination. */

export function listCategories(): CategoryRow[] {
  return all<CategoryRow>('SELECT * FROM "Category" ORDER BY "name"');
}

export function findCategoryBySlug(slug: string): CategoryRow | null {
  return one<CategoryRow>('SELECT * FROM "Category" WHERE "slug" = ?', [slug]) ?? null;
}

export function findCategoryById(id: string): CategoryRow | null {
  return one<CategoryRow>('SELECT * FROM "Category" WHERE "id" = ?', [id]) ?? null;
}

export function listSubjects(): SubjectWithCategory[] {
  return all<SubjectWithCategory>(`
    SELECT s.*, c."name" AS "categoryName", c."slug" AS "categorySlug"
    FROM "Subject" s
    JOIN "Category" c ON c."id" = s."categoryId"
    ORDER BY c."name", s."name"
  `);
}

export function listSubjectsByCategory(categoryId: string): SubjectRow[] {
  return all<SubjectRow>(
    'SELECT * FROM "Subject" WHERE "categoryId" = ? ORDER BY "name"',
    [categoryId],
  );
}

export function findSubjectBySlug(slug: string): SubjectRow | null {
  return one<SubjectRow>('SELECT * FROM "Subject" WHERE "slug" = ?', [slug]) ?? null;
}

export function findSubjectById(id: string): SubjectRow | null {
  return one<SubjectRow>('SELECT * FROM "Subject" WHERE "id" = ?', [id]) ?? null;
}

export function listTopics(): TopicRow[] {
  return all<TopicRow>('SELECT * FROM "Topic" ORDER BY "name"');
}

export function findTopicBySlug(slug: string): TopicRow | null {
  return one<TopicRow>('SELECT * FROM "Topic" WHERE "slug" = ?', [slug]) ?? null;
}

export function listTopicsBySubject(subjectId: string): TopicRow[] {
  return all<TopicRow>('SELECT * FROM "Topic" WHERE "subjectId" = ? ORDER BY "name"', [subjectId]);
}

export function countTopicsBySubject(subjectId: string): number {
  const row = one<{ n: number }>('SELECT COUNT(*) AS "n" FROM "Topic" WHERE "subjectId" = ?', [
    subjectId,
  ]);
  return row?.n ?? 0;
}

/** Maps for turning ids into display names on list pages. */
export interface TaxonomyLookup {
  categoryNames: Map<string, string>;
  subjectNames: Map<string, string>;
  topicNames: Map<string, string>;
}

export function taxonomyLookup(): TaxonomyLookup {
  return {
    categoryNames: new Map(listCategories().map((row) => [row.id, row.name])),
    subjectNames: new Map(listSubjects().map((row) => [row.id, row.name])),
    topicNames: new Map(listTopics().map((row) => [row.id, row.name])),
  };
}
