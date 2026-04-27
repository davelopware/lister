import { execFileSync } from "node:child_process";
import { access, rm, readFile, writeFile } from "node:fs/promises";
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

function hasRemoteTag(tagName) {
  try {
    const remoteTag = runCapture("git", ["ls-remote", "--tags", "--refs", "origin", `refs/tags/${tagName}`]);
    return remoteTag !== "";
  } catch {
    return false;
  }
}

function trackedGitStatus() {
  return runCapture("git", ["status", "--short", "--untracked-files=no"]);
}

async function exists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function updateJsonVersion(path, nextVersion) {
  const parsed = JSON.parse(await readFile(path, "utf8"));

  if (typeof parsed.version !== "string" || parsed.version.trim() === "") {
    throw new Error(`${path} must contain a non-empty version`);
  }

  parsed.version = nextVersion;
  await writeFile(path, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
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
const packageLockPath = resolve(rootDir, "package-lock.json");
const pluginManifestPath = resolve(rootDir, "openclaw.plugin.json");
const toolManifestPath = resolve(rootDir, "openclaw/tools/lister.tool.json");

let localTagExists = false;
let remoteTagPresent = false;

const currentBranch = runCapture("git", ["rev-parse", "--abbrev-ref", "HEAD"]);
if (currentBranch === "HEAD") {
  throw new Error("release must be run from a branch, not a detached HEAD");
}

const initialTrackedStatus = trackedGitStatus();
if (initialTrackedStatus !== "") {
  throw new Error(`release requires a clean tracked git worktree:\n${initialTrackedStatus}`);
}

// Refuse to silently replace an existing release tag.
try {
  runCapture("git", ["rev-parse", "--verify", "--quiet", `refs/tags/${tag}`]);
  localTagExists = true;
} catch {
  localTagExists = false;
}

try {
  remoteTagPresent = hasRemoteTag(tag);
} catch {
  remoteTagPresent = false;
}

if (localTagExists || remoteTagPresent) {
  const rl = createInterface({ input: stdin, output: stdout });
  const locations = [localTagExists ? "local" : "", remoteTagPresent ? "remote" : ""].filter(Boolean).join(" and ");
  const answer = (await rl.question(`tag ${tag} already exists (${locations}). overwrite it? [y/N] `)).trim().toLowerCase();
  rl.close();

  if (answer !== "y" && answer !== "yes") {
    throw new Error(`tag overwrite cancelled for ${tag}`);
  }

  if (localTagExists) {
    run("git", ["tag", "--delete", tag]);
  }
  if (remoteTagPresent) {
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

await updateJsonVersion(pluginManifestPath, packageVersion);
await updateJsonVersion(toolManifestPath, packageVersion);

const pluginManifest = JSON.parse(await readFile(pluginManifestPath, "utf8"));
const toolManifest = JSON.parse(await readFile(toolManifestPath, "utf8"));

if (pluginManifest.version !== packageVersion) {
  throw new Error(`openclaw.plugin.json version update failed: expected=${packageVersion} actual=${pluginManifest.version}`);
}

if (toolManifest.version !== packageVersion) {
  throw new Error(`openclaw/tools/lister.tool.json version update failed: expected=${packageVersion} actual=${toolManifest.version}`);
}

const filesToCommit = [
  "package.json",
  "openclaw.plugin.json",
  "openclaw/tools/lister.tool.json"
];
if (await exists(packageLockPath)) {
  filesToCommit.push("package-lock.json");
}

console.log(`Committing version bump for ${packageVersion}`);
run("git", ["add", ...filesToCommit]);
run("git", ["commit", "-m", `release: ${tag}`]);

// Build the release artifact before pushing or publishing anything.
console.log(`Packing release for ${packageVersion}`);

run("npm", ["pack"]);

if (!(await exists(tarballPath))) {
  throw new Error(`expected package artifact was not created: ${tarballName}`);
}

const postPackTrackedStatus = trackedGitStatus();
if (postPackTrackedStatus !== "") {
  throw new Error(`npm pack changed tracked files; commit or revert them before releasing:\n${postPackTrackedStatus}`);
}

// Only publish once the version, tag, and tarball are all aligned.
run("git", ["tag", tag]);
run("git", ["push", "origin", `HEAD:${currentBranch}`]);
run("git", ["push", "origin", `refs/tags/${tag}:refs/tags/${tag}`]);

if (!hasRemoteTag(tag)) {
  throw new Error(`tag push did not create refs/tags/${tag} on origin`);
}

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
