import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { nextVersion, readVersion, writeVersion } from "./version.mjs";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

function usage() {
  console.log(`Usage:
  npm run deploy
  npm run deploy -- --bump <iteration|minor|major>
  npm run deploy -- --no-bump
  npm run deploy -- --target <user@host:/absolute/web/root/>

The default bump is "iteration". Without --target, the command validates and
builds dist/ but does not contact a server. Uploads use rsync and do not delete
older remote assets.`);
}

function parseArgs(args) {
  const options = { bump: "iteration", target: null, help: false };
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--help" || argument === "-h") {
      options.help = true;
    } else if (argument === "--no-bump") {
      options.bump = null;
    } else if (argument === "--bump") {
      const value = args[index + 1];
      if (!value) throw new Error("--bump requires a value.");
      options.bump = value;
      index += 1;
    } else if (argument === "--target") {
      const value = args[index + 1];
      if (!value) throw new Error("--target requires a value.");
      options.target = value;
      index += 1;
    } else {
      throw new Error(`Unknown deploy argument "${argument}".`);
    }
  }
  return options;
}

function validateTarget(target) {
  if (!/^[A-Za-z0-9._-]+@[A-Za-z0-9.-]+:\/.+\/$/.test(target)) {
    throw new Error(
      "Deploy target must look like user@host:/absolute/web/root/ and end with a slash.",
    );
  }
}

function run(command, args) {
  console.log(`\n> ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    env: process.env,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const ending = result.signal
      ? `signal ${result.signal}`
      : `exit code ${result.status}`;
    throw new Error(`${command} failed with ${ending}.`);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    usage();
    return;
  }
  if (options.target) validateTarget(options.target);

  const originalVersion = await readVersion();
  const releaseVersion = options.bump
    ? nextVersion(originalVersion, options.bump)
    : originalVersion;

  if (releaseVersion !== originalVersion) {
    await writeVersion(releaseVersion);
    console.log(`Preparing ILTO ${originalVersion} -> ${releaseVersion}`);
  } else {
    console.log(`Preparing ILTO ${releaseVersion} without a version bump`);
  }

  try {
    run(npmCommand, ["run", "lint"]);
    run(npmCommand, ["test"]);
    run(npmCommand, ["run", "prettier-check"]);
    run(npmCommand, ["run", "build"]);
  } catch (error) {
    if (releaseVersion !== originalVersion) {
      await writeVersion(originalVersion);
      console.error(`Restored app version ${originalVersion}.`);
    }
    throw error;
  }

  if (!options.target) {
    console.log(
      `\nILTO ${releaseVersion} is ready in ${path.join(projectRoot, "dist")}. No deploy target was supplied, so nothing was uploaded.`,
    );
    return;
  }

  run("rsync", [
    "--archive",
    "--compress",
    "--human-readable",
    "dist/",
    options.target,
  ]);
  console.log(`\nDeployed ILTO ${releaseVersion} to ${options.target}.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
