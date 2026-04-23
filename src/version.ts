/**
 * Package version loader for the running Lister code.
 *
 * In OpenClaw terms, this value is surfaced in status output and other
 * user-visible metadata so the active plugin can identify its own version.
 *
 * Relative to the other entry-point files, this file stays intentionally
 * narrow: it only resolves the package version, while `tool.ts` and
 * `plugin-tool.ts` decide when that version should be exposed.
 */
import { createRequire } from "node:module";

interface PackageJsonShape {
  version?: unknown;
}

const require = createRequire(import.meta.url);

function loadListerPackageVersion(): string {
  const pkg = require("../package.json") as PackageJsonShape;
  if (typeof pkg.version !== "string" || pkg.version.trim() === "") {
    throw new Error("Unable to determine Lister package version from package.json");
  }
  return pkg.version;
}

export const LISTER_PACKAGE_VERSION = loadListerPackageVersion();
