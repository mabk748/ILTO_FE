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
  npm run deploy -- --apply

The default bump is "iteration". Without --apply, the command validates and
builds dist/ but does not change Docker. --apply invokes the guarded frontend-only
Compose deployment for the existing stack project.`);
}

function parseArgs(args) {
  const options = { bump: "iteration", apply: false, help: false };
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
    } else if (argument === "--apply") {
      options.apply = true;
    } else {
      throw new Error(`Unknown deploy argument "${argument}".`);
    }
  }
  return options;
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

  if (!options.apply) {
    console.log(
      `\nILTO ${releaseVersion} is ready in ${path.join(projectRoot, "dist")}. --apply was not supplied, so Docker was not changed.`,
    );
    return;
  }

  run("sh", [path.join(projectRoot, "scripts/deploy-frontend.sh")]);
  console.log(
    `\nDeployed ILTO ${releaseVersion} as the stack frontend service.`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
