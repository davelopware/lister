import test from "node:test";
import assert from "node:assert/strict";
import * as lister from "../../../dist/tool.js";
import { withTempStore } from "../helpers/testHelpers.mjs";

test("lists(): returns list records with name, type, and description", async () => {
  await withTempStore(async (context) => {
    await lister.create({ list: "tasks", listType: "todos", description: "Delivery commitments" }, context);
    await lister.create({ list: "notes", listType: "general" }, context);

    const result = await lister.lists(context);
    assert.equal(result.ok, true);
    assert.deepEqual(result.lists, [
      {
        name: "notes",
        list_type: "general",
        description: "A description of the list"
      },
      {
        name: "tasks",
        list_type: "todos",
        description: "Delivery commitments"
      }
    ]);
  });
});
