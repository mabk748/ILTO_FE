export const MAX_IMPORT_FILE_BYTES = 2 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 2_000;

export type ImportFileFormat = "csv" | "json";
export type ImportSourceRow = Record<string, unknown>;

export type ParsedImportFile =
  | {
      format: "csv";
      headers: string[];
      rows: ImportSourceRow[];
    }
  | {
      format: "json";
      value: unknown;
    };

export class ImportParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImportParseError";
  }
}

export function importFileFormat(fileName: string): ImportFileFormat {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".csv")) return "csv";
  if (lower.endsWith(".json")) return "json";
  throw new ImportParseError("Choose a CSV or JSON file.");
}

function csvRecords(text: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let quoted = false;
  let afterQuote = false;

  const finishField = () => {
    record.push(field);
    field = "";
    afterQuote = false;
  };
  const finishRecord = () => {
    finishField();
    records.push(record);
    record = [];
  };

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
          afterQuote = true;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (
      afterQuote &&
      character !== "," &&
      character !== "\r" &&
      character !== "\n"
    )
      throw new ImportParseError(
        `Malformed CSV near character ${index + 1}: unexpected text after a closing quote.`,
      );
    if (character === '"') {
      if (field)
        throw new ImportParseError(
          `Malformed CSV near character ${index + 1}: quotes must begin a field.`,
        );
      quoted = true;
    } else if (character === ",") {
      finishField();
    } else if (character === "\n") {
      finishRecord();
    } else if (character === "\r") {
      if (text[index + 1] === "\n") index += 1;
      finishRecord();
    } else {
      field += character;
    }
  }

  if (quoted)
    throw new ImportParseError("Malformed CSV: a quoted field is not closed.");
  if (field || record.length > 0 || afterQuote) finishRecord();
  return records;
}

function parseCsv(text: string): ParsedImportFile {
  const records = csvRecords(text.replace(/^\uFEFF/, ""));
  if (records.length === 0)
    throw new ImportParseError("The CSV file is empty.");
  const headers = records[0].map((header) => header.trim());
  if (headers.length === 0 || headers.some((header) => !header))
    throw new ImportParseError("The CSV header contains a blank field name.");
  if (new Set(headers).size !== headers.length)
    throw new ImportParseError(
      "The CSV header contains duplicate field names.",
    );
  const dataRecords = records.slice(1);
  if (dataRecords.length === 0)
    throw new ImportParseError("The CSV file has a header but no data rows.");
  if (dataRecords.length > MAX_IMPORT_ROWS)
    throw new ImportParseError(
      `This file has more than the ${MAX_IMPORT_ROWS.toLocaleString()} row frontend limit.`,
    );
  const rows = dataRecords.map((values, index) => {
    if (values.length !== headers.length)
      throw new ImportParseError(
        `CSV row ${index + 2} has ${values.length} fields; expected ${headers.length}.`,
      );
    return Object.fromEntries(
      headers.map((header, column) => [header, values[column]]),
    );
  });
  return { format: "csv", headers, rows };
}

function parseJson(text: string): ParsedImportFile {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new ImportParseError("The JSON file is malformed.");
  }
  if (value === null || (typeof value === "string" && !value.trim()))
    throw new ImportParseError("The JSON file is empty.");
  return { format: "json", value };
}

export function parseImportFile(
  fileName: string,
  text: string,
): ParsedImportFile {
  if (!text.trim()) throw new ImportParseError("The selected file is empty.");
  if (new Blob([text]).size > MAX_IMPORT_FILE_BYTES)
    throw new ImportParseError(
      "The selected file exceeds the 2 MB frontend limit.",
    );
  return importFileFormat(fileName) === "csv"
    ? parseCsv(text)
    : parseJson(text);
}
