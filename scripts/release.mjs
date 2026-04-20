import { execFileSync } from "node:child_process";
import { access, rm, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// ============================================================================
// Helper functions.
// ============================================================================

function usage() {
  console.log("usage: npm run release -- <x.y.z>");
}

function run(command, args) {
  execFileSync(command, args, {
    cwd: rootDir,
    stdio: "inherit"
  });
}

function runCapture(command, args) {
  return execFileSync(command, args, {
    cwd: rootDir,
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8"
  }).trim();
}

async function exists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// Argument parsing.
// ============================================================================

const requestedVersion = process.argv[2];

// Keep the entrypoint explicit and shell-friendly.
if (!requestedVersion || requestedVersion === "--help" || requestedVersion === "-h") {
  usage();
  process.exit(requestedVersion ? 0 : 1);
}

// The script adds the tag prefix itself.
if (requestedVersion.startsWith("v")) {
  throw new Error(`Do not start version with 'v', that will be added automatically: ${requestedVersion}`);
}

// ============================================================================
// Main logic.
// ============================================================================

const packageJsonPath = resolve(rootDir, "package.json");
const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
const currentPackageVersion = packageJson.version;

if (typeof currentPackageVersion !== "string" || currentPackageVersion.trim() === "") {
  throw new Error("package.json must contain a non-empty version");
}

const tag = `v${requestedVersion}`;
const tarballName = `lister-${requestedVersion}.tgz`;
const tarballPath = resolve(rootDir, tarballName);

let localTagExists = false;
let remoteTagExists = false;

// Refuse to silently replace an existing release tag.
try {
  runCapture("git", ["rev-parse", "--verify", "--quiet", `refs/tags/${tag}`]);
  localTagExists = true;
} catch {
  localTagExists = false;
}

try {
  const remoteTag = runCapture("git", ["ls-remote", "--tags", "--refs", "origin", `refs/tags/${tag}`]);
  remoteTagExists = remoteTag !== "";
} catch {
  remoteTagExists = false;
}

if (localTagExists || remoteTagExists) {
  const rl = createInterface({ input: stdin, output: stdout });
  const locations = [localTagExists ? "local" : "", remoteTagExists ? "remote" : ""].filter(Boolean).join(" and ");
  const answer = (await rl.question(`tag ${tag} already exists (${locations}). overwrite it? [y/N] `)).trim().toLowerCase();
  rl.close();

  if (answer !== "y" && answer !== "yes") {
    throw new Error(`tag overwrite cancelled for ${tag}`);
  }

  if (localTagExists) {
    run("git", ["tag", "--delete", tag]);
  }
  if (remoteTagExists) {
    run("git", ["push", "origin", `:refs/tags/${tag}`]);
  }
}

if (await exists(tarballPath)) {
  await rm(tarballPath);
}

// Update package.json without letting npm create its own tag/commit.
console.log(`Updating version from ${currentPackageVersion} to ${requestedVersion}`);

run("npm", ["version", requestedVersion, "--no-git-tag-version"]);

const updatedPackageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
const packageVersion = updatedPackageJson.version;

if (packageVersion !== requestedVersion) {
  throw new Error(`version update failed: requested=${requestedVersion} package.json=${packageVersion}`);
}

// Build the release artifact before pushing or publishing anything.
console.log(`Creating release for ${packageVersion}`);

run("git", ["tag", tag]);
run("npm", ["pack"]);

if (!(await exists(tarballPath))) {
  throw new Error(`expected package artifact was not created: ${tarballName}`);
}

// Only publish once the version, tag, and tarball are all aligned.
run("git", ["push", "origin", tag]);
run("gh", [
  "release",
  "create",
  tag,
  tarballName,
  "--verify-tag",
  "--title",
  tag,
  "--notes",
  `Lister ${packageVersion}`
]);
