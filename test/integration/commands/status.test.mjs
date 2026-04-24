import test from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import * as lister from "../../../dist/tool.js";
import { LISTER_PACKAGE_VERSION } from "../../../dist/index.js";
import { withTempStore } from "../helpers/testHelpers.mjs";

test("status(): returns store path, existence, and aggregate counts across lists", async () => {
  await withTempStore(async (context) => {
    await lister.create({ list: "tasks", listType: "todos", description: "Delivery commitments" }, context);
    await lister.add(
      {
        list: "tasks",
        data: { text: "Task one", due: "2026-05-01T09:00:00Z", status: "open" }
      },
      context
    );
    await lister.add({ list: "bugs", data: { text: "Bug one" } }, context);

    const status = await lister.status(context);
    assert.equal(status.ok, true);
    assert.equal(status.extension_version, LISTER_PACKAGE_VERSION);
    assert.equal(status.store_path, context.dbPath);
    assert.equal(status.store_exists, true);
    assert.equal(status.custom_list_types_path, join(context.dbPath, "_config", "custom-list-types.json"));
    assert.equal(status.custom_list_types_exists, false);
    assert.equal(status.lists, 2);
    assert.equal(status.items, 2);
  });
});
