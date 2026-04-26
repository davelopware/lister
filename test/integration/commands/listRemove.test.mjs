import test from "node:test";
import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import * as lister from "../../../dist/tool.js";
import { withTempStore } from "../helpers/testHelpers.mjs";

test("listRemove(): requires confirm and deletes the list file", async () => {
  await withTempStore(async (context, dbPath) => {
    await lister.listCreate({ list: "tasks", listType: "todos", description: "Delivery commitments" }, context);
    await lister.itemCreate(
      {
        list: "tasks",
        data: { text: "Task one", due: "2026-05-01T09:00:00Z", status: "open" }
      },
      context
    );

    const rejected = await lister.listRemove({ list: "tasks" }, context);
    assert.equal(rejected.ok, false);
    assert.match(rejected.error, /confirm must be true/);

    const removed = await lister.listRemove({ list: "tasks", confirm: true }, context);
    assert.equal(removed.ok, true);
    assert.equal(removed.removed, "tasks");

    const files = await readdir(dbPath);
    assert.deepEqual(files, []);

    const listed = await lister.listsGet(context);
    assert.equal(listed.ok, true);
    assert.equal(listed.count, 0);
  });
});
