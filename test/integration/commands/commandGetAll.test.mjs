import test from "node:test";
import assert from "node:assert/strict";
import * as lister from "../../../dist/tool.js";

test("commandGetAll(): returns the available commands with descriptions", async () => {
  const result = await lister.commandGetAll();
  assert.equal(result.ok, true);
  assert.equal(result.count, 13);

  const names = result.commands.map((entry) => entry.name);
  assert.deepEqual(names, [
    "commandGetAll",
    "commandGet",
    "typeGetAll",
    "typeGet",
    "listCreate",
    "listsGet",
    "itemCreate",
    "itemGetAll",
    "itemRemove",
    "itemUpdate",
    "listClear",
    "listRemove",
    "status",
  ]);

  const itemCreate = result.commands.find((entry) => entry.name === "itemCreate");
  assert.equal(!!itemCreate, true);
  assert.match(itemCreate.description, /Add an item/);
});
