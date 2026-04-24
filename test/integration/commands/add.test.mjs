import test from "node:test";
import assert from "node:assert/strict";
import * as lister from "../../../dist/tool.js";
import { withTempStore, writeListTypesConfig } from "../helpers/testHelpers.mjs";

test("add(): appends by default, inserts at id, and oversized id appends", async () => {
  await withTempStore(async (context) => {
    await lister.add({ list: "notes", data: { text: "one" } }, context);
    await lister.add({ list: "notes", data: { text: "two" } }, context);
    await lister.add({ list: "notes", id: 1, data: { text: "zero" } }, context);
    await lister.add({ list: "notes", id: 99, data: { text: "three" } }, context);

    const listed = await lister.items({ list: "notes" }, context);
    assert.equal(listed.ok, true);
    assert.deepEqual(listed.items.map((item) => ({ id: item.id, text: item.data.text })), [
      { id: 1, text: "zero" },
      { id: 2, text: "one" },
      { id: 3, text: "two" },
      { id: 4, text: "three" }
    ]);
  });
});

test("add(): enforces list-type payload schemas", async () => {
  await withTempStore(async (context) => {
    await lister.create({ list: "people-list", listType: "people" }, context);

    const rejected = await lister.add({ list: "people-list", data: { text: "wrong schema" } }, context);
    assert.equal(rejected.ok, false);
    assert.match(rejected.error, /Expected fields/);

    const accepted = await lister.add(
      {
        list: "people-list",
        data: {
          nickname: "sam",
          name: "Sam Lee",
          email: "sam@example.com",
          phone: "+1555000111",
          relation: "friend",
          birthday: "1991-06-02",
          additional: "Met at conference"
        }
      },
      context
    );
    assert.equal(accepted.ok, true);
  });
});

test("add(): supports habits, shopping-items, health-log, and waiting-on payloads", async () => {
  await withTempStore(async (context) => {
    await lister.create({ list: "habit-list", listType: "habits" }, context);
    await lister.create({ list: "shopping-list", listType: "shopping-items" }, context);
    await lister.create({ list: "health-list", listType: "health-log" }, context);
    await lister.create({ list: "waiting-list", listType: "waiting-on" }, context);

    const habitAdded = await lister.add(
      {
        list: "habit-list",
        data: {
          habit: "meditate",
          frequency: "daily",
          target: "10 minutes",
          progress: "5 of 7 days this week",
          last_completed: "2026-04-18T08:00:00Z",
          streak: 5,
          notes: "Morning session"
        }
      },
      context
    );
    assert.equal(habitAdded.ok, true);

    const shoppingAdded = await lister.add(
      {
        list: "shopping-list",
        data: {
          item: "oats",
          quantity: 2,
          category: "grocery",
          store: "market",
          budget: 12.5,
          status: "planned"
        }
      },
      context
    );
    assert.equal(shoppingAdded.ok, true);

    const healthAdded = await lister.add(
      {
        list: "health-list",
        data: {
          metric: "weight",
          value: 75.2,
          unit: "kg",
          recorded_at: "2026-04-18T07:30:00Z",
          context: "fasted",
          notes: "steady"
        }
      },
      context
    );
    assert.equal(healthAdded.ok, true);

    const waitingAdded = await lister.add(
      {
        list: "waiting-list",
        data: {
          subject: "vendor quote",
          owner: "Acme Sales",
          requested_at: "2026-04-15T10:00:00Z",
          due_by: "2026-04-22T17:00:00Z",
          status: "pending",
          next_follow_up: "2026-04-20T09:00:00Z"
        }
      },
      context
    );
    assert.equal(waitingAdded.ok, true);
  });
});

test("add(): supports merged custom list types", async () => {
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
    const added = await lister.add(
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
    assert.equal(added.ok, true);
  });
});
