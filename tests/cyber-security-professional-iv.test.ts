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
  topics: { code: string; slug: string; name: string; section: string }[];
  questions: BankQuestion[];
}

const bank = JSON.parse(
  fs.readFileSync(
    path.join(
      process.cwd(),
      "cyber-security-professional-iv",
      "cyber-security-professional-iv.json",
    ),
    "utf8",
  ),
) as Bank;

describe("Cyber Security Professional IV 200-question bank", () => {
  it("contains all 200 unique numbered questions", () => {
    expect(bank.examName).toBe("Cyber Security Professional IV - 200 Challenging MCQs");
    expect(bank.questions).toHaveLength(200);
    expect(bank.bankSize).toBe(200);
    expect(bank.totalQuestions).toBe(200);

    const numbers = bank.questions.map((q) => q.num);
    expect(new Set(numbers).size).toBe(200);
    expect(Math.min(...numbers)).toBe(1);
    expect(Math.max(...numbers)).toBe(200);
  });

  it("gives every question four options and one valid answer", () => {
    for (const question of bank.questions) {
      expect(question.text.trim().length).toBeGreaterThan(0);
      expect(question.options).toHaveLength(4);
      expect(question.options.every((opt) => opt.trim().length > 0)).toBe(true);
      expect(question.explanation.trim().length).toBeGreaterThan(0);
      expect(question.correctIndex).toBe("ABCD".indexOf(question.correctAnswer));
      expect(question.options[question.correctIndex]).toBe(
        question.explanation.replace(/^Correct answer is [A-D]: /, ""),
      );
    }
  });

  it("maps every question to one of the six document sections", () => {
    expect(bank.topics).toHaveLength(6);
    const topicSlugs = new Set(bank.topics.map((t) => t.slug));
    expect(topicSlugs.size).toBe(6);

    const counts: Record<string, number> = {};
    for (const question of bank.questions) {
      expect(topicSlugs.has(question.topicSlug)).toBe(true);
      expect(question.section).toBe(
        bank.topics.find((t) => t.slug === question.topicSlug)?.section,
      );
      counts[question.topicSlug] = (counts[question.topicSlug] || 0) + 1;
    }

    const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
    expect(total).toBe(200);
    for (const topic of bank.topics) {
      expect(counts[topic.slug]).toBeGreaterThan(0);
    }
  });
});
