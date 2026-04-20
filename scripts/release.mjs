import { execFileSync } from "node:child_process";
import { access, rm, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

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

const requestedVersion = process.argv[2];

if (!requestedVersion || requestedVersion === "--help" || requestedVersion === "-h") {
  usage();
  process.exit(requestedVersion ? 0 : 1);
}

if (requestedVersion.startsWith("v")) {
  throw new Error(`Do not start version with 'v', that will be added automatically: ${requestedVersion}`);
}

const packageJsonPath = resolve(rootDir, "package.json");
const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
const packageVersion = packageJson.version;

if (typeof packageVersion !== "string" || packageVersion.trim() === "") {
  throw new Error("package.json must contain a non-empty version");
}

if (requestedVersion !== packageVersion) {
  throw new Error(`version mismatch: arg=${requestedVersion} package.json=${packageVersion}`);
}

const tag = `v${packageVersion}`;
const tarballName = `lister-${packageVersion}.tgz`;
const tarballPath = resolve(rootDir, tarballName);

let localTagExists = false;
let remoteTagExists = false;

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

console.log(`Creating release for ${packageVersion}`);

run("git", ["tag", tag]);
run("npm", ["pack"]);

if (!(await exists(tarballPath))) {
  throw new Error(`expected package artifact was not created: ${tarballName}`);
}

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
