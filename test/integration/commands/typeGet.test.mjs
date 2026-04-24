import test from "node:test";
import assert from "node:assert/strict";
import * as lister from "../../../dist/tool.js";

test("typeGet(): returns the field schema for one list type", async () => {
  const result = await lister.typeGet({ listTypeName: "todos" });
  assert.equal(result.ok, true);
  assert.equal(result.listTypeName, "todos");
  assert.deepEqual(result.fields.map((field) => field.name), ["text", "due", "status"]);
});
