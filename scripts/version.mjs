import { readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
export const VERSION_FILE = path.join(projectRoot, "app.config.json");

const VERSION_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(\d{2}|[1-9]\d{2,})$/;
const BUMP_PARTS = new Set(["iteration", "minor", "major"]);

function assertCounter(value, name) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative safe integer.`);
  }
}

export function formatVersion({ major, minor, iteration }) {
  assertCounter(major, "major");
  assertCounter(minor, "minor");
  assertCounter(iteration, "iteration");
  return `${major}.${minor}.${String(iteration).padStart(2, "0")}`;
}

export function parseVersion(value) {
  if (typeof value !== "string" || !VERSION_PATTERN.test(value)) {
    throw new Error(
      `Invalid app version "${String(value)}". Expected major.minor.iteration, for example 0.1.00.`,
    );
  }

  const [major, minor, iteration] = value.split(".").map(Number);
  const parsed = { major, minor, iteration };
  if (formatVersion(parsed) !== value) {
    throw new Error(`App version "${value}" is not in canonical form.`);
  }
  return parsed;
}

export function nextVersion(value, part = "iteration") {
  if (!BUMP_PARTS.has(part)) {
    throw new Error(
      `Unknown version part "${part}". Use iteration, minor, or major.`,
    );
  }

  const current = parseVersion(value);
  if (part === "iteration") {
    current.iteration += 1;
  } else if (part === "minor") {
    current.minor += 1;
    current.iteration = 0;
  } else {
    current.major += 1;
    current.minor = 0;
    current.iteration = 0;
  }
  return formatVersion(current);
}

async function readConfig(file) {
  let value;
  try {
    value = JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    throw new Error(`Could not read ${file}: ${error.message}`, {
      cause: error,
    });
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${file} must contain a JSON object.`);
  }
  return value;
}

export async function readVersion(file = VERSION_FILE) {
  const config = await readConfig(file);
  parseVersion(config.version);
  return config.version;
}

export async function writeVersion(version, file = VERSION_FILE) {
  parseVersion(version);
  const config = await readConfig(file);
  const temporaryFile = `${file}.${process.pid}.tmp`;
  try {
    await writeFile(
      temporaryFile,
      `${JSON.stringify({ ...config, version }, null, 2)}\n`,
      "utf8",
    );
    await rename(temporaryFile, file);
  } finally {
    await rm(temporaryFile, { force: true });
  }
}

function usage() {
  console.log(`Usage:
  npm run app:version
  npm run app:version -- bump [iteration|minor|major]
  npm run app:version -- set <major.minor.iteration>

Examples:
  npm run app:version -- bump iteration  # 0.1.00 -> 0.1.01
  npm run app:version -- bump minor      # 0.1.00 -> 0.2.00
  npm run app:version -- set 1.0.00`);
}

async function main(args) {
  const [command = "show", value, ...extra] = args;
  if (extra.length > 0) throw new Error("Too many version arguments.");

  if (command === "--help" || command === "-h" || command === "help") {
    usage();
    return;
  }

  const current = await readVersion();
  if (command === "show") {
    if (value !== undefined)
      throw new Error("The show command takes no value.");
    console.log(current);
    return;
  }

  let next;
  if (command === "bump") {
    next = nextVersion(current, value ?? "iteration");
  } else if (command === "set") {
    if (!value) throw new Error("The set command requires a version.");
    parseVersion(value);
    next = value;
  } else {
    throw new Error(`Unknown version command "${command}".`);
  }

  await writeVersion(next);
  console.log(`${current} -> ${next}`);
}

const invokedUrl = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : "";
if (import.meta.url === invokedUrl) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
