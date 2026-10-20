import fs from "node:fs";
import path from "node:path";

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
  fs.readFileSync(
    path.join(process.cwd(), "behavioral-1000", "behavioral-1000.json"),
    "utf8",
  ),
) as Bank;

describe("Behavioral Competency 1,000-question bank", () => {
  it("contains all 1,000 unique numbered questions", () => {
    expect(bank.questions).toHaveLength(1000);
    expect(bank.bankSize).toBe(1000);

    const numbers = bank.questions.map((question) => question.num);
    expect(new Set(numbers).size).toBe(1000);
    expect(Math.min(...numbers)).toBe(1);
    expect(Math.max(...numbers)).toBe(1000);
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

  it("is large enough for a 100-question randomized paper from every chapter", () => {
    expect(bank.totalQuestions).toBe(100);
    const perTopic: Record<string, number> = {};
    for (const question of bank.questions) {
      perTopic[question.topicSlug] = (perTopic[question.topicSlug] ?? 0) + 1;
    }
    // Every chapter must be able to fill its 6-7 question share.
    for (const topic of bank.topics) {
      expect(perTopic[topic.slug]).toBeGreaterThanOrEqual(7);
    }
  });
});
