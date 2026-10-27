import fs from "node:fs";
import path from "node:path";

import { createRng, selectQuestions, targetCountsByWeights } from "@/server/exam-engine";
import type { ExamTemplate, Question } from "@/types";

interface BankQuestion {
  num: number;
  section: string;
  topicSlug: string;
  text: string;
  options: string[];
  correctAnswer: "A" | "B" | "C" | "D";
  correctIndex: number;
  explanation: string;
}

interface Bank {
  examName: string;
  totalQuestions: number;
  bankSize: number;
  topics: { section: string; slug: string; name: string; code: string }[];
  questions: BankQuestion[];
}

const bank = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "mock-exam-2", "mock-exam-2.json"), "utf8"),
) as Bank;

describe("Mock Exam 2 200-question bank", () => {
  it("contains all 200 unique numbered questions", () => {
    expect(bank.examName).toBe("Mock Exam 2");
    expect(bank.questions).toHaveLength(200);
    expect(bank.bankSize).toBe(200);
    expect(bank.totalQuestions).toBe(100);

    const numbers = bank.questions.map((question) => question.num);
    expect(new Set(numbers).size).toBe(200);
    expect(Math.min(...numbers)).toBe(1);
    expect(Math.max(...numbers)).toBe(200);
  });

  it("gives every question four options, one answer, and an explanation", () => {
    for (const question of bank.questions) {
      expect(question.text.trim().length).toBeGreaterThan(0);
      expect(question.options).toHaveLength(4);
      expect(question.options.every((option) => option.trim().length > 0)).toBe(true);
      expect(question.explanation.trim().length).toBeGreaterThan(0);
      expect(question.correctIndex).toBe("ABCD".indexOf(question.correctAnswer));
    }
  });

  it("covers all 16 chapters and links every question to a known topic", () => {
    expect(bank.topics).toHaveLength(16);
    const topicSlugs = new Set(bank.topics.map((topic) => topic.slug));
    expect(topicSlugs.size).toBe(16);

    for (const question of bank.questions) {
      expect(topicSlugs.has(question.topicSlug)).toBe(true);
    }
  });

  it("can fill the randomized 100-question paper from its 200-question bank", () => {
    const perTopic: Record<string, number> = {};
    for (const question of bank.questions) {
      perTopic[question.topicSlug] = (perTopic[question.topicSlug] ?? 0) + 1;
    }

    const targets = targetCountsByWeights(bank.totalQuestions, perTopic);
    expect(Object.values(targets).reduce((sum, count) => sum + count, 0)).toBe(100);

    for (const topic of bank.topics) {
      expect(perTopic[topic.slug]).toBeGreaterThanOrEqual(targets[topic.slug] ?? 0);
    }
  });

  it("draws 100 different random questions from the 200-question bank", () => {
    const bankQuestions: Question[] = bank.questions.map((question) => ({
      id: `question-${question.num}`,
      questionId: `ME2-${String(question.num).padStart(4, "0")}`,
      questionText: question.text,
      categoryId: "category",
      subjectId: "subject",
      topicId: question.topicSlug,
      difficulty: "INTERMEDIATE" as const,
      questionType: "SINGLE_CHOICE" as const,
      options: question.options,
      correctOptionIndices: [question.correctIndex],
      explanation: question.explanation,
      marks: 1,
      negativeMarks: null,
      tags: [question.section],
      learningObjectives: null,
      source: null,
      authorId: "author",
      status: "PUBLISHED" as const,
      publishedAt: null,
      archivedAt: null,
      importId: null,
      canonicalIndices: [0, 1, 2, 3],
      createdAt: "",
      updatedAt: "",
    }));

    const topicWeights: Record<string, number> = {};
    for (const question of bank.questions) {
      topicWeights[question.topicSlug] = (topicWeights[question.topicSlug] ?? 0) + 1;
    }

    const template: ExamTemplate = {
      id: "template",
      slug: "mock-exam-2",
      name: "Mock Exam 2",
      categoryId: "category",
      subjectId: "subject",
      topicWeights,
      totalQuestions: 100,
      durationMinutes: 120,
      marksPerQuestion: 1,
      negativeMarking: false,
      difficultyDistribution: { INTERMEDIATE: 1 },
      randomizeQuestions: true,
      randomizeOptions: true,
      avoidPreviouslySeen: false,
      allowReuse: false,
      autoSubmitOnExpiry: true,
      passThresholdPercent: 70,
      description: "",
      isPublic: true,
      publishedAt: null,
      createdAt: "",
      updatedAt: "",
    };

    const first = selectQuestions({ pool: bankQuestions, template, rng: createRng(1) });
    const second = selectQuestions({ pool: bankQuestions, template, rng: createRng(2) });

    expect(first).toHaveLength(100);
    expect(second).toHaveLength(100);
    expect(new Set(first.map((question) => question.id)).size).toBe(100);
    expect(new Set(second.map((question) => question.id)).size).toBe(100);

    const firstIds = new Set(first.map((question) => question.id));
    const overlap = second.filter((question) => firstIds.has(question.id)).length;
    expect(overlap).toBeLessThan(100);
  });
});
