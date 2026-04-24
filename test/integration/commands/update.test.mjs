import test from "node:test";
import assert from "node:assert/strict";
import * as lister from "../../../dist/tool.js";
import { withTempStore, writeListTypesConfig } from "../helpers/testHelpers.mjs";

test("update(): edits item data by id and validates parser rules", async () => {
  await withTempStore(async (context) => {
    await lister.create({ list: "tasks", listType: "todos" }, context);
    await lister.add(
      {
        list: "tasks",
        data: { text: "initial", due: "2026-05-01T09:00:00Z", status: "open" }
      },
      context
    );

    const updated = await lister.update(
      {
        list: "tasks",
        id: 1,
        data: { text: "updated", due: "2026-05-03T09:00:00Z", status: "open" }
      },
      context
    );
    assert.equal(updated.ok, true);

    const invalid = await lister.update(
      {
        list: "tasks",
        id: 1,
        data: { text: "wrong" }
      },
      context
    );
    assert.equal(invalid.ok, false);
    assert.match(invalid.error, /Expected fields/);

    const missing = await lister.update(
      {
        list: "tasks",
        id: 99,
        data: { text: "updated", due: "2026-05-03T09:00:00Z", status: "open" }
      },
      context
    );
    assert.equal(missing.ok, false);
    assert.equal(missing.error, "item not found");
  });
});

test("update(): supports merged custom list types", async () => {
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

    await lister.create({ list: "suppliers", listType: "vendors" }, context);
    await lister.add(
      {
        list: "suppliers",
        data: {
          name: "Acme Corp",
          owner: "Finance",
          renewal_date: "2026-07-01T00:00:00Z"
        }
      },
      context
    );

    const updated = await lister.update(
      {
        list: "suppliers",
        id: 1,
        data: {
          name: "Acme Corp",
          owner: "Procurement",
          renewal_date: "2026-07-15T00:00:00Z"
        }
      },
      context
    );
    assert.equal(updated.ok, true);

    const listed = await lister.items({ list: "suppliers" }, context);
    assert.deepEqual(listed.items[0].data, {
      name: "Acme Corp",
      owner: "Procurement",
      renewal_date: "2026-07-15T00:00:00Z"
    });
  });
});
