import {
  csvRowsToObjects,
  normaliseHeader,
  parseCsv,
  parseIndexList,
  splitDelimited,
} from "@/server/import";

describe("parseCsv", () => {
  it("splits plain rows and cells", () => {
    expect(parseCsv("a,b,c\n1,2,3")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("handles CRLF line endings", () => {
    expect(parseCsv("a,b\r\n1,2\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("keeps commas inside quoted fields", () => {
    const rows = parseCsv('text,value\n"hello, world",2');
    expect(rows[1]).toEqual(["hello, world", "2"]);
  });

  it("unescapes doubled quotes", () => {
    const rows = parseCsv('text\n"she said ""hi"""');
    expect(rows[1]).toEqual(['she said "hi"']);
  });

  it("keeps newlines inside quoted fields", () => {
    const rows = parseCsv('text,value\n"line one\nline two",3');
    expect(rows).toHaveLength(2);
    expect(rows[1][0]).toBe("line one\nline two");
    expect(rows[1][1]).toBe("3");
  });

  it("strips a UTF-8 BOM", () => {
    expect(parseCsv("\uFEFFa,b")[0]).toEqual(["a", "b"]);
  });

  it("drops blank lines", () => {
    expect(parseCsv("a,b\n\n1,2\n")).toHaveLength(2);
  });

  it("returns nothing for empty input", () => {
    expect(parseCsv("")).toEqual([]);
  });
});

describe("normaliseHeader", () => {
  it.each([
    ["questionText", "questionText"],
    ["Question Text", "questionText"],
    ["QUESTION_TEXT", "questionText"],
    ["question", "questionText"],
    ["text", "questionText"],
    ["type", "questionType"],
    ["answer", "correctOptionIndices"],
    ["correct", "correctOptionIndices"],
    ["subject", "subjectSlug"],
    ["topic", "topicSlug"],
    ["option3", "option3"],
  ])("maps %s to %s", (input, expected) => {
    expect(normaliseHeader(input)).toBe(expected);
  });
});

describe("splitDelimited", () => {
  it("accepts pipe, comma, and semicolon separators", () => {
    expect(splitDelimited("0|2")).toEqual(["0", "2"]);
    expect(splitDelimited("0,2")).toEqual(["0", "2"]);
    expect(splitDelimited("0;2")).toEqual(["0", "2"]);
  });

  it("accepts a JSON array", () => {
    expect(splitDelimited("[0, 2]")).toEqual(["0", "2"]);
  });

  it("drops empty entries and trims whitespace", () => {
    expect(splitDelimited(" 0 | | 2 ")).toEqual(["0", "2"]);
    expect(splitDelimited("")).toEqual([]);
  });
});

describe("parseIndexList", () => {
  it("keeps valid zero-based indices", () => {
    expect(parseIndexList("0|2|3")).toEqual([0, 2, 3]);
  });

  it("drops non-numeric and negative entries", () => {
    expect(parseIndexList("0|abc|-1|2")).toEqual([0, 2]);
  });
});

describe("csvRowsToObjects", () => {
  it("keys each row by its normalised header", () => {
    const objects = csvRowsToObjects(
      "Question Text,Type,Difficulty,Option1,Option2,Answer\n" +
        '"What is 2+2?",SINGLE_CHOICE,EASY,"3","4",1',
    );

    expect(objects).toHaveLength(1);
    expect(objects[0].questionText).toBe("What is 2+2?");
    expect(objects[0].questionType).toBe("SINGLE_CHOICE");
    expect(objects[0].difficulty).toBe("EASY");
    expect(objects[0].option1).toBe("3");
    expect(objects[0].option2).toBe("4");
    expect(objects[0].correctOptionIndices).toBe("1");
  });

  it("fills missing trailing cells with an empty string", () => {
    const objects = csvRowsToObjects("questionText,difficulty\ntext only");
    expect(objects[0].difficulty).toBe("");
  });

  it("returns nothing when the file has only a header", () => {
    expect(csvRowsToObjects("questionText,difficulty")).toEqual([]);
  });

  it("returns nothing for an empty file", () => {
    expect(csvRowsToObjects("")).toEqual([]);
  });
});
