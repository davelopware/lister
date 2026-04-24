import test from "node:test";
import assert from "node:assert/strict";
import * as lister from "../../../dist/tool.js";

test("commandArgs(): returns required and optional args for a command", async () => {
  const result = await lister.commandArgs({ commandName: "add" });
  assert.equal(result.ok, true);
  assert.equal(result.commandName, "add");
  assert.deepEqual(result.requiredArgs.map((entry) => entry.name), ["list", "data"]);
  assert.deepEqual(result.optionalArgs.map((entry) => entry.name), ["id"]);
});
