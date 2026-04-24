import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import { collectProductionPackages } from "../helpers/testHelpers.mjs";

test("package contract: runtime deps and SDK subpath import stay aligned", async () => {
  const pkg = JSON.parse(await readFile(new URL("../../../package.json", import.meta.url), "utf8"));
  const lock = JSON.parse(await readFile(new URL("../../../package-lock.json", import.meta.url), "utf8"));
  const builtEntry = await readFile(new URL("../../../dist/index.js", import.meta.url), "utf8");
  const builtTool = await readFile(new URL("../../../dist/pluginTool.js", import.meta.url), "utf8");
  const builtCommand = await readFile(new URL("../../../dist/commands/ListCreateCommand.js", import.meta.url), "utf8");
  const productionPackages = collectProductionPackages(lock);

  assert.equal(pkg.dependencies["@sinclair/typebox"], "^0.34.49");
  assert.equal(pkg.devDependencies.openclaw, "^2026.4.15");
  assert.equal(pkg.dependencies.openclaw, undefined);
  assert.deepEqual(productionPackages.map((entry) => entry.name), ["@sinclair/typebox"]);
  for (const entry of productionPackages) {
    assert.equal(entry.pkg.hasInstallScript, undefined, `${entry.name} should not require npm lifecycle scripts`);
    assert.equal(entry.pkg.gypfile, undefined, `${entry.name} should not require native compilation`);
    assert.equal(entry.pkg.requiresBuild, undefined, `${entry.name} should not require generated build artifacts`);
  }
  assert.deepEqual(pkg.openclaw.compat, {
    pluginApiRange: ">=2026.4.15 <2027.0.0",
    minGatewayVersion: "2026.4.15"
  });
  assert.deepEqual(pkg.openclaw.build, {
    builtWithOpenClawVersion: "2026.4.15",
    pluginSdkVersion: "2026.4.15"
  });
  assert.deepEqual(pkg.openclaw.install, {
    minHostVersion: ">=2026.4.15"
  });
  assert.match(builtEntry, /openclaw\/plugin-sdk\/plugin-entry/);
  assert.match(builtTool, /configureServices/);
  assert.match(builtCommand, /@sinclair\/typebox/);
});

test("package layout: publish shape matches native plugin expectations", async () => {
  const pkg = JSON.parse(await readFile(new URL("../../../package.json", import.meta.url), "utf8"));
  const manifest = JSON.parse(await readFile(new URL("../../../openclaw.plugin.json", import.meta.url), "utf8"));
  const skillEntries = await readdir(new URL("../../../openclaw/skills", import.meta.url), { withFileTypes: true });

  await access(new URL("../../../dist/index.js", import.meta.url));
  await access(new URL("../../../dist/builtin-list-types.json", import.meta.url));
  await access(new URL("../../../openclaw/tools/lister.tool.json", import.meta.url));

  assert.equal(manifest.id, "lister");
  assert.deepEqual(pkg.openclaw.extensions, ["./dist/index.js"]);
  assert.deepEqual(pkg.files, ["dist", "openclaw", "openclaw.plugin.json", "README.md"]);
  assert.equal(skillEntries.some((entry) => entry.isDirectory() && entry.name === "lister"), true);
});
