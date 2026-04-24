import test from "node:test";
import assert from "node:assert/strict";
import * as lister from "../../../dist/tool.js";
import { withTempStore } from "../helpers/testHelpers.mjs";

test("itemRemove(): requires list and reindexes lower items", async () => {
  await withTempStore(async (context) => {
    await lister.itemCreate({ list: "notes", data: { text: "one" } }, context);
    await lister.itemCreate({ list: "notes", data: { text: "two" } }, context);
    await lister.itemCreate({ list: "notes", data: { text: "three" } }, context);

    const rejected = await lister.itemRemove({ id: 1 }, context);
    assert.equal(rejected.ok, false);
    assert.equal(rejected.error, "list is required");

    const removed = await lister.itemRemove({ list: "notes", id: 2 }, context);
    assert.equal(removed.ok, true);

    const listed = await lister.itemGetAll({ list: "notes" }, context);
    assert.deepEqual(listed.items.map((item) => ({ id: item.id, text: item.data.text })), [
      { id: 1, text: "one" },
      { id: 2, text: "three" }
    ]);
  });
});
