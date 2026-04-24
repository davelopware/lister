import test from "node:test";
import assert from "node:assert/strict";
import * as lister from "../../../dist/tool.js";

test("showCommands(): returns the available commands with descriptions", async () => {
  const result = await lister.showCommands();
  assert.equal(result.ok, true);
  assert.equal(result.count, 12);

  const names = result.commands.map((entry) => entry.name).sort();
  assert.deepEqual(names, [
    "add",
    "clear",
    "commandArgs",
    "create",
    "items",
    "listTypeSchema",
    "lists",
    "remove",
    "showCommands",
    "showListTypes",
    "status",
    "update"
  ]);

  const add = result.commands.find((entry) => entry.name === "add");
  assert.equal(!!add, true);
  assert.match(add.description, /Add an item/);
});
