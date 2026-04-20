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
