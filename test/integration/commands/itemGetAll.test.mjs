import test from "node:test";
import assert from "node:assert/strict";
import * as lister from "../../../dist/tool.js";
import { withTempStore } from "../helpers/testHelpers.mjs";

test("itemGetAll(): returns positional order and supports filtering/limit", async () => {
  await withTempStore(async (context) => {
    await lister.itemCreate({ list: "notes", data: { text: "one" } }, context);
    await lister.itemCreate({ list: "notes", data: { text: "two" } }, context);
    await lister.itemCreate({ list: "notes", data: { text: "three" } }, context);

    const filtered = await lister.itemGetAll({ list: "notes", limit: 2 }, context);
    assert.equal(filtered.ok, true);
    assert.equal(filtered.count, 2);
    assert.deepEqual(filtered.items.map((item) => item.id), [1, 2]);
  });
});
