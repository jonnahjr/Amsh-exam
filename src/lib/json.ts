/**
 * Helpers for the TEXT columns that hold JSON.
 *
 * Corrupt or missing values fall back rather than throwing, so one bad row
 * cannot take down a whole page.
 */

export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (value === null || value === undefined || value === "") return fallback;
  try {
    const parsed = JSON.parse(value) as unknown;
    return (parsed ?? fallback) as T;
  } catch {
    return fallback;
  }
}

export function stringifyJson(value: unknown): string {
  return JSON.stringify(value ?? null);
}

/** Parse a JSON array of numbers, dropping anything that is not a finite integer. */
export function parseIndexArray(value: string | null | undefined): number[] {
  const raw = parseJson<unknown>(value, []);
  if (!Array.isArray(raw)) return [];
  const seen = new Set<number>();
  for (const entry of raw) {
    const numeric = typeof entry === "number" ? entry : Number(entry);
    if (Number.isInteger(numeric) && numeric >= 0) seen.add(numeric);
  }
  return [...seen].sort((a, b) => a - b);
}

/**
 * Parse a `Record<string, number[]>` where the array is a *set* of indices.
 *
 * Used for student responses: `[2,0]` and `[0,2]` mean the same thing, so the
 * values are de-duplicated and sorted into a canonical form.
 *
 * Do NOT use this for the attempt's `optionMapping` — that array is an ordered
 * permutation where position is the meaning. Use `parseOrderedIndexMap`.
 */
export function parseIndexMap(value: string | null | undefined): Record<string, number[]> {
  const raw = parseJson<unknown>(value, {});
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const result: Record<string, number[]> = {};
  for (const [key, entry] of Object.entries(raw as Record<string, unknown>)) {
    if (!Array.isArray(entry)) continue;
    const seen = new Set<number>();
    for (const item of entry) {
      const numeric = typeof item === "number" ? item : Number(item);
      if (Number.isInteger(numeric) && numeric >= 0) seen.add(numeric);
    }
    result[key] = [...seen].sort((a, b) => a - b);
  }
  return result;
}

/**
 * Parse a `Record<string, number[]>` where **array order is significant**.
 *
 * This is for the attempt's `optionMapping`, which maps a display position to a
 * canonical option index: `[2,0,3,1]` means "display position 0 shows canonical
 * option 2". Sorting or de-duplicating it would silently undo option shuffling
 * and mark shuffled attempts against the wrong answers.
 */
export function parseOrderedIndexMap(
  value: string | null | undefined,
): Record<string, number[]> {
  const raw = parseJson<unknown>(value, {});
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const result: Record<string, number[]> = {};
  for (const [key, entry] of Object.entries(raw as Record<string, unknown>)) {
    if (!Array.isArray(entry)) continue;
    const indices: number[] = [];
    for (const item of entry) {
      const numeric = typeof item === "number" ? item : Number(item);
      if (Number.isInteger(numeric) && numeric >= 0) indices.push(numeric);
    }
    result[key] = indices;
  }
  return result;
}

/** Parse a `Record<string, boolean>` (flags). */
export function parseFlagMap(value: string | null | undefined): Record<string, boolean> {
  const raw = parseJson<unknown>(value, {});
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const result: Record<string, boolean> = {};
  for (const [key, entry] of Object.entries(raw as Record<string, unknown>)) {
    result[key] = entry === true || entry === 1 || entry === "true";
  }
  return result;
}

/** Parse a JSON array of strings. */
export function parseStringArray(value: string | null | undefined): string[] {
  const raw = parseJson<unknown>(value, []);
  if (!Array.isArray(raw)) return [];
  return raw.filter((entry): entry is string => typeof entry === "string");
}
