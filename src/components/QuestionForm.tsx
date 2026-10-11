"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { apiRequest, errorMessages } from "@/lib/client";
import { OPTION_LETTERS } from "@/components/review-utils";
import {
  DIFFICULTIES,
  QUESTION_TYPES,
  type Difficulty,
  type QuestionType,
  type SubjectRow,
  type TopicRow,
} from "@/types";

interface QuestionFormProps {
  subjects: SubjectRow[];
  topics: TopicRow[];
}

/** Question types that need an option list and a marked answer. */
const OPTION_TYPES: QuestionType[] = [
  "SINGLE_CHOICE",
  "MULTIPLE_CHOICE",
  "TRUE_FALSE",
  "SCENARIO",
  "MATCHING",
];

const needsOptions = (type: QuestionType) => OPTION_TYPES.includes(type);
const singleAnswerOnly = (type: QuestionType) =>
  type === "SINGLE_CHOICE" || type === "TRUE_FALSE";

export function QuestionForm({ subjects, topics }: QuestionFormProps) {
  const router = useRouter();

  const [questionText, setQuestionText] = useState("");
  const [questionType, setQuestionType] = useState<QuestionType>("SINGLE_CHOICE");
  const [difficulty, setDifficulty] = useState<Difficulty>("EASY");
  const [options, setOptions] = useState<string[]>(["", "", "", ""]);
  const [correct, setCorrect] = useState<number[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [marks, setMarks] = useState("1");
  const [negativeMarks, setNegativeMarks] = useState("");
  const [explanation, setExplanation] = useState("");
  const [tags, setTags] = useState("");
  const [learningObjectives, setLearningObjectives] = useState("");
  const [source, setSource] = useState("");
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED">("PUBLISHED");

  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const availableTopics = useMemo(
    () => (subjectId ? topics.filter((topic) => topic.subjectId === subjectId) : []),
    [subjectId, topics],
  );

  const selectedSubject = subjects.find((subject) => subject.id === subjectId);

  function changeType(next: QuestionType) {
    setQuestionType(next);
    if (!needsOptions(next)) {
      setOptions([]);
      setCorrect([]);
    } else if (options.length < 2) {
      setOptions(next === "TRUE_FALSE" ? ["True", "False"] : ["", "", "", ""]);
      setCorrect([]);
    }
    if (singleAnswerOnly(next) && correct.length > 1) {
      setCorrect(correct.slice(0, 1));
    }
  }

  function updateOption(index: number, value: string) {
    setOptions((prev) => prev.map((entry, i) => (i === index ? value : entry)));
  }

  function addOption() {
    if (options.length >= 26) return;
    setOptions((prev) => [...prev, ""]);
  }

  function removeOption(index: number) {
    setOptions((prev) => prev.filter((_, i) => i !== index));
    // Drop the removed index and shift anything after it.
    setCorrect((prev) =>
      prev.filter((entry) => entry !== index).map((entry) => (entry > index ? entry - 1 : entry)),
    );
  }

  function toggleCorrect(index: number) {
    setCorrect((prev) => {
      if (singleAnswerOnly(questionType)) return prev.includes(index) ? [] : [index];
      return prev.includes(index)
        ? prev.filter((entry) => entry !== index)
        : [...prev, index].sort((a, b) => a - b);
    });
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setErrors([]);

    const payload = {
      questionText,
      questionType,
      difficulty,
      options: needsOptions(questionType) ? options : [],
      correctOptionIndices: needsOptions(questionType) ? correct : [],
      categoryId: selectedSubject?.categoryId ?? undefined,
      subjectId: subjectId || undefined,
      topicId: topicId || undefined,
      marks: Number(marks) || 1,
      negativeMarks: negativeMarks === "" ? undefined : Number(negativeMarks),
      explanation: explanation || undefined,
      tags: tags
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean),
      learningObjectives: learningObjectives || undefined,
      source: source || undefined,
      status,
    };

    try {
      await apiRequest("/api/questions", { method: "POST", body: payload });
      router.push("/questions");
      router.refresh();
    } catch (error) {
      setErrors(errorMessages(error));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="stack" noValidate>
      {errors.length > 0 && (
        <div className="alert alert-error">
          <strong>Could not save the question.</strong>
          <ul>
            {errors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="card">
        <h3>Question</h3>

        <div className="field">
          <label htmlFor="questionText">Question text</label>
          <textarea
            id="questionText"
            value={questionText}
            onChange={(event) => setQuestionText(event.target.value)}
            rows={3}
            required
            placeholder="What does the S3 storage class Standard guarantee?"
          />
        </div>

        <div className="field-grid">
          <div className="field">
            <label htmlFor="questionType">Type</label>
            <select
              id="questionType"
              value={questionType}
              onChange={(event) => changeType(event.target.value as QuestionType)}
            >
              {QUESTION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="difficulty">Difficulty</label>
            <select
              id="difficulty"
              value={difficulty}
              onChange={(event) => setDifficulty(event.target.value as Difficulty)}
            >
              {DIFFICULTIES.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              value={status}
              onChange={(event) => setStatus(event.target.value as "DRAFT" | "PUBLISHED")}
            >
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
            </select>
            <div className="field-hint">Only published questions are used in exams.</div>
          </div>
        </div>
      </div>

      {needsOptions(questionType) ? (
        <div className="card">
          <div className="row-between">
            <h3 style={{ margin: 0 }}>Options</h3>
            <span className="field-hint">
              {singleAnswerOnly(questionType)
                ? "Tick exactly one correct option."
                : "Tick every correct option."}
            </span>
          </div>

          <div style={{ marginTop: 14 }}>
            {options.map((option, index) => (
              <div key={index} className="row" style={{ marginBottom: 8, flexWrap: "nowrap" }}>
                <label className="checkbox-row" style={{ margin: 0, flex: "none" }}>
                  <input
                    type={singleAnswerOnly(questionType) ? "radio" : "checkbox"}
                    checked={correct.includes(index)}
                    onChange={() => toggleCorrect(index)}
                    aria-label={`Mark option ${OPTION_LETTERS[index]} correct`}
                  />
                </label>
                <span className="option-key">{OPTION_LETTERS[index]}</span>
                <input
                  type="text"
                  value={option}
                  onChange={(event) => updateOption(index, event.target.value)}
                  placeholder={`Option ${OPTION_LETTERS[index]}`}
                />
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => removeOption(index)}
                  disabled={options.length <= 2}
                  aria-label={`Remove option ${OPTION_LETTERS[index]}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="btn btn-sm"
            onClick={addOption}
            disabled={options.length >= 26}
          >
            + Add option
          </button>
        </div>
      ) : (
        <div className="alert alert-info">
          {questionType.replace(/_/g, " ")} questions have no options. They can be stored in the
          bank but are not auto-gradable.
        </div>
      )}

      <div className="card">
        <h3>Classification</h3>

        <div className="field-grid">
          <div className="field">
            <label htmlFor="subject">Subject</label>
            <select
              id="subject"
              value={subjectId}
              onChange={(event) => {
                setSubjectId(event.target.value);
                setTopicId("");
              }}
            >
              <option value="">— none —</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="topic">Topic</label>
            <select
              id="topic"
              value={topicId}
              onChange={(event) => setTopicId(event.target.value)}
              disabled={!subjectId}
            >
              <option value="">— none —</option>
              {availableTopics.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.name}
                </option>
              ))}
            </select>
            {!subjectId && <div className="field-hint">Pick a subject first.</div>}
          </div>
        </div>

        <div className="field">
          <label htmlFor="tags">Tags</label>
          <input
            id="tags"
            type="text"
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            placeholder="iam, security, networking"
          />
          <div className="field-hint">Comma separated.</div>
        </div>
      </div>

      <div className="card">
        <h3>Marking and notes</h3>

        <div className="field-grid">
          <div className="field">
            <label htmlFor="marks">Marks</label>
            <input
              id="marks"
              type="number"
              min="0.5"
              step="0.5"
              value={marks}
              onChange={(event) => setMarks(event.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="negativeMarks">Negative marks</label>
            <input
              id="negativeMarks"
              type="number"
              min="0"
              step="0.25"
              value={negativeMarks}
              onChange={(event) => setNegativeMarks(event.target.value)}
              placeholder="Defaults to 25% of marks"
            />
            <div className="field-hint">
              Only applied for exams that enable negative marking.
            </div>
          </div>
        </div>

        <div className="field">
          <label htmlFor="explanation">Explanation</label>
          <textarea
            id="explanation"
            value={explanation}
            onChange={(event) => setExplanation(event.target.value)}
            rows={2}
            placeholder="Shown to students in the answer review."
          />
        </div>

        <div className="field">
          <label htmlFor="learningObjectives">Learning objectives</label>
          <textarea
            id="learningObjectives"
            value={learningObjectives}
            onChange={(event) => setLearningObjectives(event.target.value)}
            rows={2}
          />
        </div>

        <div className="field">
          <label htmlFor="source">Source</label>
          <input
            id="source"
            type="text"
            value={source}
            onChange={(event) => setSource(event.target.value)}
            placeholder="e.g. AWS SAA-C03 study guide"
          />
        </div>
      </div>

      <div className="row">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "Saving…" : "Save question"}
        </button>
        <button type="button" className="btn" onClick={() => router.back()} disabled={busy}>
          Cancel
        </button>
      </div>
    </form>
  );
}
