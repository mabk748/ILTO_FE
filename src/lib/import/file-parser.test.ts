import { describe, expect, it } from "vitest";
import { ImportParseError, parseImportFile } from "./file-parser.ts";

describe("local import file parser", () => {
  it("parses quoted CSV, escaped quotes, commas, and newlines", () => {
    expect(
      parseImportFile(
        "tasks.csv",
        'title,description,story_points\r\n"Test, import","Line 1\nLine 2",3.5\r\n"Say ""hello""",Done,1',
      ),
    ).toEqual({
      format: "csv",
      headers: ["title", "description", "story_points"],
      rows: [
        {
          title: "Test, import",
          description: "Line 1\nLine 2",
          story_points: "3.5",
        },
        { title: 'Say "hello"', description: "Done", story_points: "1" },
      ],
    });
  });

  it.each([
    ["empty CSV", "tasks.csv", "", /empty/i],
    ["missing header", "tasks.csv", ",title\nvalue,Task", /blank field/i],
    ["malformed CSV", "tasks.csv", 'title\n"open', /not closed/i],
    ["malformed JSON", "tasks.json", "{no", /malformed/i],
    ["unsupported file", "tasks.txt", "title", /CSV or JSON/i],
  ])("rejects %s", (_label, name, input, message) => {
    expect(() => parseImportFile(name, input)).toThrow(message);
  });

  it("parses JSON without changing its structure", () => {
    const value = [{ title: "One" }, { title: "Two" }];
    expect(parseImportFile("tasks.json", JSON.stringify(value))).toEqual({
      format: "json",
      value,
    });
  });

  it("uses a typed parsing error", () => {
    expect(() => parseImportFile("tasks.json", "nope")).toThrow(
      ImportParseError,
    );
  });
});
