import test from "node:test";
import assert from "node:assert/strict";
import * as lister from "../../../dist/tool.js";
import { withTempStore, writeListTypesConfig } from "../helpers/testHelpers.mjs";

test("itemUpdate(): patches item data by id and validates parser rules", async () => {
  await withTempStore(async (context) => {
    await lister.listCreate({ list: "tasks", listType: "todos" }, context);
    await lister.itemCreate(
      {
        list: "tasks",
        data: { text: "initial", due: "2026-05-01T09:00:00Z", status: "open" }
      },
      context
    );

    const updated = await lister.itemUpdate(
      {
        list: "tasks",
        id: 1,
        data: { text: "updated", due: "2026-05-03T09:00:00Z" }
      },
      context
    );
    assert.equal(updated.ok, true);
    assert.deepEqual(updated.item.data, {
      text: "updated",
      due: "2026-05-03T09:00:00Z",
      status: "open"
    });

    const invalid = await lister.itemUpdate(
      {
        list: "tasks",
        id: 1,
        data: { status: 123 }
      },
      context
    );
    assert.equal(invalid.ok, false);
    assert.equal(invalid.error, "status must be a string");

    const unknownField = await lister.itemUpdate(
      {
        list: "tasks",
        id: 1,
        data: { text: "wrong", extra: "nope" }
      },
      context
    );
    assert.equal(unknownField.ok, false);
    assert.match(unknownField.error, /Expected fields/);

    const missing = await lister.itemUpdate(
      {
        list: "tasks",
        id: 99,
        data: { text: "updated" }
      },
      context
    );
    assert.equal(missing.ok, false);
    assert.equal(missing.error, "item not found");
  });
});

test("itemUpdate(): supports merged custom list types", async () => {
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

    await lister.listCreate({ list: "suppliers", listType: "vendors" }, context);
    await lister.itemCreate(
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

    const updated = await lister.itemUpdate(
      {
        list: "suppliers",
        id: 1,
        data: {
          owner: "Procurement",
          renewal_date: "2026-07-15T00:00:00Z"
        }
      },
      context
    );
    assert.equal(updated.ok, true);

    const listed = await lister.itemGetAll({ list: "suppliers" }, context);
    assert.deepEqual(listed.items[0].data, {
      name: "Acme Corp",
      owner: "Procurement",
      renewal_date: "2026-07-15T00:00:00Z"
    });
  });
});
