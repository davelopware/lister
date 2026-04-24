import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import * as lister from "../../../dist/tool.js";
import { LISTER_PACKAGE_VERSION } from "../../../dist/index.js";
import { withTempStore } from "../helpers/testHelpers.mjs";

test("listClear(): removes all items from a list and preserves list metadata", async () => {
  await withTempStore(async (context, dbPath) => {
    await lister.listCreate({ list: "tasks", listType: "todos", description: "Delivery commitments" }, context);
    await lister.itemCreate(
      {
        list: "tasks",
        data: { text: "Task one", due: "2026-05-01T09:00:00Z", status: "open" }
      },
      context
    );

    const cleared = await lister.listClear({ list: "tasks", confirm: true }, context);
    assert.equal(cleared.ok, true);
    assert.equal(cleared.removed, 1);

    const listed = await lister.itemGetAll({ list: "tasks" }, context);
    assert.equal(listed.count, 0);

    const files = await readdir(dbPath);
    assert.deepEqual(files.sort(), ["tasks.json"]);

    const tasksRaw = await readFile(join(dbPath, "tasks.json"), "utf8");
    const tasksParsed = JSON.parse(tasksRaw);
    assert.equal(tasksParsed.list_type, "todos");
    assert.equal(tasksParsed.description, "Delivery commitments");
    assert.equal(tasksParsed.version, LISTER_PACKAGE_VERSION);
    assert.deepEqual(tasksParsed.items, []);
  });
});
