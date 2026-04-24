import test from "node:test";
import assert from "node:assert/strict";
import * as lister from "../../../dist/tool.js";
import { withTempStore } from "../helpers/testHelpers.mjs";

test("listCreate(): creates lists with explicit type and description", async () => {
  await withTempStore(async (context) => {
    const created = await lister.listCreate({ list: "tasks", listType: "todos", description: "Delivery commitments" }, context);
    assert.equal(created.ok, true);
    assert.equal(created.created, true);
    assert.equal(created.list_type, "todos");
    assert.equal(created.description, "Delivery commitments");
  });
});
