import test from "node:test";
import assert from "node:assert/strict";
import * as lister from "../../../dist/tool.js";
import { withTempStore, writeListTypesConfig } from "../helpers/testHelpers.mjs";

test("typeGetAll(): returns all supported type names with descriptions only", async () => {
  const result = await lister.typeGetAll();
  assert.equal(result.ok, true);
  assert.equal(result.count, 7);

  const names = result.listTypes.map((entry) => entry.name).sort();
  assert.deepEqual(names, ["general", "habits", "health-log", "people", "shopping-items", "todos", "waiting-on"]);

  const todos = result.listTypes.find((entry) => entry.name === "todos");
  assert.equal(!!todos, true);
  assert.equal(typeof todos.description, "string");
  assert.equal("fields" in todos, false);
});

test("typeGetAll(): merges custom types from store config", async () => {
  await withTempStore(async (context, dbPath) => {
    await writeListTypesConfig(dbPath, {
      types: [
        {
          name: "vendors",
          purpose: "Track suppliers and commercial contacts.",
          fields: [
            { name: "name", type: "string", description: "Vendor name" },
            { name: "owner", type: "string", description: "Internal owner" },
            { name: "renewal_date", type: "datetime", description: "Renewal date" }
          ]
        }
      ]
    });

    const result = await lister.typeGetAll(context);
    assert.equal(result.ok, true);
    assert.equal(result.count, 8);

    const vendors = result.listTypes.find((entry) => entry.name === "vendors");
    assert.equal(vendors.name, "vendors");
    assert.equal(typeof vendors.description, "string");
  });
});
