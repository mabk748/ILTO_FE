import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  formatVersion,
  nextVersion,
  parseVersion,
  readVersion,
  writeVersion,
} from "./version.mjs";

test("parses and formats the application version convention", () => {
  assert.deepEqual(parseVersion("0.1.00"), {
    major: 0,
    minor: 1,
    iteration: 0,
  });
  assert.equal(formatVersion({ major: 2, minor: 3, iteration: 7 }), "2.3.07");
  assert.equal(
    formatVersion({ major: 2, minor: 3, iteration: 100 }),
    "2.3.100",
  );
});

test("increments iteration, minor, and major counters predictably", () => {
  assert.equal(nextVersion("0.1.00"), "0.1.01");
  assert.equal(nextVersion("0.1.09", "iteration"), "0.1.10");
  assert.equal(nextVersion("0.1.99", "iteration"), "0.1.100");
  assert.equal(nextVersion("0.1.42", "minor"), "0.2.00");
  assert.equal(nextVersion("2.8.42", "major"), "3.0.00");
});

test("rejects ambiguous versions and unknown bump counters", () => {
  for (const value of ["0.1.0", "0.01.00", "v0.1.00", "0.1.-1"]) {
    assert.throws(() => parseVersion(value), /Invalid app version/);
  }
  assert.throws(() => nextVersion("0.1.00", "metric"), /Unknown version part/);
});

test("updates only the version field in a configuration file", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "ilto-version-test-"));
  const file = path.join(directory, "app.config.json");
  try {
    await writeFile(
      file,
      `${JSON.stringify({ version: "0.1.00", futureMetric: 7 })}\n`,
      "utf8",
    );
    await writeVersion("0.1.01", file);

    assert.equal(await readVersion(file), "0.1.01");
    assert.deepEqual(JSON.parse(await readFile(file, "utf8")), {
      version: "0.1.01",
      futureMetric: 7,
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
