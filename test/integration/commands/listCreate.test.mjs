import test from "node:test";
import assert from "node:assert/strict";
import * as lister from "../../../dist/tool.js";
import { withTempStore } from "../helpers/testHelpers.mjs";

test("listCreate(): creates lists with explicit type and description", async () => {
  await withTempStore(async (context) => {
    const created = await lister.listCreate({ list: "tasks", listType: "todos", description: "Track delivery commitments" }, context);
    assert.equal(created.ok, true);
    assert.equal(created.created, true);
    assert.equal(created.list_type, "todos");
    assert.equal(created.description, "Track delivery commitments");
  });
});

test("listCreate(): rejects descriptions shorter than ten characters", async () => {
  await withTempStore(async (context) => {
    const rejected = await lister.listCreate({ list: "tasks", listType: "todos", description: "too short" }, context);
    assert.equal(rejected.ok, false);
    assert.equal(rejected.error, "description must be at least 10 characters");
  });
});

test("listCreate(): normalizes empty values for an optional firstItem payload", async () => {
  await withTempStore(async (context) => {
    const created = await lister.listCreate(
      {
        list: "health-list",
        listType: "health-log",
        description: "Track health readings",
        firstItem: {
          metric: null,
          value: "",
          unit: "",
          recorded_at: "",
          context: "fasted",
          notes: null
        }
      },
      context
    );
    assert.equal(created.ok, true);
    assert.deepEqual(created.item.data, {
      metric: "",
      value: null,
      unit: "",
      recorded_at: null,
      context: "fasted",
      notes: ""
    });

    const listed = await lister.itemGetAll({ list: "health-list" }, context);
    assert.equal(listed.ok, true);
    assert.deepEqual(listed.items[0].data, {
      metric: "",
      value: null,
      unit: "",
      recorded_at: null,
      context: "fasted",
      notes: ""
    });
  });
});
