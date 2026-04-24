import test from "node:test";
import assert from "node:assert/strict";
import * as lister from "../../../dist/tool.js";

test("commandGet(): returns required and optional args for a command", async () => {
  const result = await lister.commandGet({ commandName: "itemCreate" });
  assert.equal(result.ok, true);
  assert.equal(result.commandName, "itemCreate");
  assert.deepEqual(result.requiredArgs.map((entry) => entry.name), ["list", "data"]);
  assert.deepEqual(result.optionalArgs.map((entry) => entry.name), ["id"]);
});
