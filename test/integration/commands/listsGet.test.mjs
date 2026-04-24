import test from "node:test";
import assert from "node:assert/strict";
import * as lister from "../../../dist/tool.js";
import { withTempStore } from "../helpers/testHelpers.mjs";

test("listsGet(): returns list records with name, type, and description", async () => {
  await withTempStore(async (context) => {
    await lister.listCreate({ list: "tasks", listType: "todos", description: "Delivery commitments" }, context);
    await lister.listCreate({ list: "notes", listType: "general" }, context);

    const result = await lister.listsGet(context);
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
