import test from "node:test";
import assert from "node:assert/strict";
import * as lister from "../../../dist/tool.js";
import { withTempStore } from "../helpers/testHelpers.mjs";

test("security: rejects invalid or traversal-like list names", async () => {
  await withTempStore(async (context) => {
    const cases = ["", "../secrets", "notes/2026", "UPPER", "name with spaces", ".hidden"];

    for (const list of cases) {
      const result = await lister.create({ list, listType: "general" }, context);
      assert.equal(result.ok, false);
      assert.match(result.error, /list is required|invalid list name/);
    }
  });
});
