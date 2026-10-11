import {
  loginSchema,
  questionInputSchema,
  registerSchema,
  templateInputSchema,
} from "@/lib/validation";

/** A valid base payload that individual tests then bend out of shape. */
const validQuestion = {
  questionText: "Which port does HTTPS use by default?",
  questionType: "SINGLE_CHOICE" as const,
  difficulty: "EASY" as const,
  options: ["21", "80", "443", "8080"],
  correctOptionIndices: [2],
  marks: 1,
  tags: ["network"],
  status: "PUBLISHED" as const,
};

function messagesFor(input: unknown): string[] {
  const result = questionInputSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
}

describe("registerSchema", () => {
  it("accepts a valid registration and lowercases the email", () => {
    const parsed = registerSchema.parse({
      email: "  Sam@Example.COM ",
      password: "supersecret",
      name: "Sam",
    });
    expect(parsed.email).toBe("sam@example.com");
  });

  it("rejects a short password", () => {
    const result = registerSchema.safeParse({ email: "a@b.com", password: "short" });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed email", () => {
    const result = registerSchema.safeParse({ email: "not-an-email", password: "supersecret" });
    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("requires a non-empty password", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "" }).success).toBe(false);
  });

  it("accepts valid credentials", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "x" }).success).toBe(true);
  });
});

describe("questionInputSchema", () => {
  it("accepts a well-formed question", () => {
    expect(questionInputSchema.safeParse(validQuestion).success).toBe(true);
  });

  it("rejects an empty question text", () => {
    expect(messagesFor({ ...validQuestion, questionText: "  " }).length).toBeGreaterThan(0);
  });

  it("rejects a correct index that is out of range", () => {
    const messages = messagesFor({ ...validQuestion, correctOptionIndices: [9] });
    expect(messages.join(" ")).toMatch(/out of range/i);
  });

  it("requires at least two options for choice questions", () => {
    const messages = messagesFor({ ...validQuestion, options: ["only one"], correctOptionIndices: [0] });
    expect(messages.join(" ")).toMatch(/at least two options/i);
  });

  it("requires at least one marked answer", () => {
    const messages = messagesFor({ ...validQuestion, correctOptionIndices: [] });
    expect(messages.join(" ")).toMatch(/at least one option as correct/i);
  });

  it("allows only one correct answer for single choice", () => {
    const messages = messagesFor({ ...validQuestion, correctOptionIndices: [0, 1] });
    expect(messages.join(" ")).toMatch(/only have one correct option/i);
  });

  it("allows multiple correct answers for multi-select", () => {
    const result = questionInputSchema.safeParse({
      ...validQuestion,
      questionType: "MULTIPLE_CHOICE",
      correctOptionIndices: [0, 2],
    });
    expect(result.success).toBe(true);
  });

  it("does not require options for an essay question", () => {
    const result = questionInputSchema.safeParse({
      ...validQuestion,
      questionType: "ESSAY",
      options: [],
      correctOptionIndices: [],
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative marks greater than the question's marks", () => {
    const messages = messagesFor({ ...validQuestion, marks: 1, negativeMarks: 5 });
    expect(messages.join(" ")).toMatch(/cannot exceed/i);
  });

  it("rejects zero or negative marks", () => {
    expect(messagesFor({ ...validQuestion, marks: 0 }).length).toBeGreaterThan(0);
  });

  it("rejects an unknown difficulty", () => {
    expect(messagesFor({ ...validQuestion, difficulty: "TRIVIAL" }).length).toBeGreaterThan(0);
  });
});

describe("templateInputSchema", () => {
  const validTemplate = {
    name: "AWS Fundamentals Mock",
    totalQuestions: 6,
    durationMinutes: 10,
    marksPerQuestion: 1,
    negativeMarking: true,
    passThresholdPercent: 60,
    difficultyDistribution: { EASY: 0.5, HARD: 0.5 },
  };

  it("accepts a valid template and applies defaults", () => {
    const parsed = templateInputSchema.parse(validTemplate);
    expect(parsed.randomizeQuestions).toBe(true);
    expect(parsed.randomizeOptions).toBe(true);
    expect(parsed.autoSubmitOnExpiry).toBe(true);
    expect(parsed.isPublic).toBe(true);
  });

  it("rejects a zero question count", () => {
    expect(templateInputSchema.safeParse({ ...validTemplate, totalQuestions: 0 }).success).toBe(false);
  });

  it("rejects a pass threshold above 100", () => {
    expect(
      templateInputSchema.safeParse({ ...validTemplate, passThresholdPercent: 150 }).success,
    ).toBe(false);
  });

  it("rejects an invalid slug", () => {
    const result = templateInputSchema.safeParse({ ...validTemplate, slug: "Not A Slug!" });
    expect(result.success).toBe(false);
  });

  it("accepts a lowercase hyphenated slug", () => {
    const result = templateInputSchema.safeParse({ ...validTemplate, slug: "aws-mock-1" });
    expect(result.success).toBe(true);
  });
});
