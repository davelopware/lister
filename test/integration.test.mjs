import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import * as lister from "../dist/tool.js";

async function withTempStore(run) {
  const dbPath = await mkdtemp(join(tmpdir(), "lister-integration-"));
  try {
    await run({ dbPath }, dbPath);
  } finally {
    await rm(dbPath, { recursive: true, force: true });
  }
}

async function readListFile(dbPath, listName) {
  const raw = await readFile(join(dbPath, `${listName}.json`), "utf8");
  return JSON.parse(raw);
}

test("listTypes(): returns all supported types with metadata", async () => {
  const result = await lister.listTypes();
  assert.equal(result.ok, true);
  assert.equal(result.count, 7);

  const names = result.types.map((entry) => entry.name).sort();
  assert.deepEqual(names, ["general", "habits", "health-log", "people", "shopping-items", "todos", "waiting-on"]);

  const todos = result.types.find((entry) => entry.name === "todos");
  assert.equal(!!todos, true);
  assert.deepEqual(
    todos.fields.map((field) => field.name),
    ["text", "due", "status"]
  );
});

test("create(): creates lists with explicit type and description", async () => {
  await withTempStore(async (context) => {
    const created = await lister.create({ list: "tasks", listType: "todos", description: "Delivery commitments" }, context);
    assert.equal(created.ok, true);
    assert.equal(created.created, true);
    assert.equal(created.list_type, "todos");
    assert.equal(created.description, "Delivery commitments");
  });
});

test("lists(): returns list records with name, type, and description", async () => {
  await withTempStore(async (context) => {
    await lister.create({ list: "tasks", listType: "todos", description: "Delivery commitments" }, context);
    await lister.create({ list: "notes", listType: "general" }, context);

    const result = await lister.lists(context);
    assert.equal(result.ok, true);
    assert.deepEqual(result.lists, [
      {
        name: "notes",
        list_type: "general",
        description: "A description of the list"
      },
      {
        name: "tasks",
        list_type: "todos",
        description: "Delivery commitments"
      }
    ]);
  });
});

test("add(): appends by default, inserts at id, and oversized id appends", async () => {
  await withTempStore(async (context) => {
    await lister.add({ list: "notes", data: { text: "one" } }, context);
    await lister.add({ list: "notes", data: { text: "two" } }, context);
    await lister.add({ list: "notes", id: 1, data: { text: "zero" } }, context);
    await lister.add({ list: "notes", id: 99, data: { text: "three" } }, context);

    const listed = await lister.items({ list: "notes" }, context);
    assert.equal(listed.ok, true);
    assert.deepEqual(
      listed.items.map((item) => ({ id: item.id, text: item.data.text })),
      [
        { id: 1, text: "zero" },
        { id: 2, text: "one" },
        { id: 3, text: "two" },
        { id: 4, text: "three" }
      ]
    );
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

test("items(): returns positional order and supports filtering/limit", async () => {
  await withTempStore(async (context) => {
    await lister.add({ list: "notes", data: { text: "one" } }, context);
    await lister.add({ list: "notes", data: { text: "two" } }, context);
    await lister.add({ list: "notes", data: { text: "three" } }, context);

    const filtered = await lister.items({ list: "notes", limit: 2 }, context);
    assert.equal(filtered.ok, true);
    assert.equal(filtered.count, 2);
    assert.deepEqual(filtered.items.map((item) => item.id), [1, 2]);
  });
});

test("remove(): requires list and reindexes lower items", async () => {
  await withTempStore(async (context) => {
    await lister.add({ list: "notes", data: { text: "one" } }, context);
    await lister.add({ list: "notes", data: { text: "two" } }, context);
    await lister.add({ list: "notes", data: { text: "three" } }, context);

    const rejected = await lister.remove({ id: 1 }, context);
    assert.equal(rejected.ok, false);
    assert.equal(rejected.error, "list is required");

    const removed = await lister.remove({ list: "notes", id: 2 }, context);
    assert.equal(removed.ok, true);

    const listed = await lister.items({ list: "notes" }, context);
    assert.deepEqual(
      listed.items.map((item) => ({ id: item.id, text: item.data.text })),
      [
        { id: 1, text: "one" },
        { id: 2, text: "three" }
      ]
    );
  });
});

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

test("stats(): returns aggregate counts across lists", async () => {
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

    const stats = await lister.stats(context);
    assert.equal(stats.ok, true);
    assert.equal(stats.lists, 2);
    assert.equal(stats.items, 2);
  });
});

test("clear(): removes all items from a list and preserves list metadata", async () => {
  await withTempStore(async (context, dbPath) => {
    await lister.create({ list: "tasks", listType: "todos", description: "Delivery commitments" }, context);
    await lister.add(
      {
        list: "tasks",
        data: { text: "Task one", due: "2026-05-01T09:00:00Z", status: "open" }
      },
      context
    );

    const cleared = await lister.clear({ list: "tasks", confirm: true }, context);
    assert.equal(cleared.ok, true);
    assert.equal(cleared.removed, 1);

    const listed = await lister.items({ list: "tasks" }, context);
    assert.equal(listed.count, 0);

    const files = await readdir(dbPath);
    assert.deepEqual(files.sort(), ["tasks.json"]);

    const tasksRaw = await readFile(join(dbPath, "tasks.json"), "utf8");
    const tasksParsed = JSON.parse(tasksRaw);
    assert.equal(tasksParsed.list_type, "todos");
    assert.equal(tasksParsed.description, "Delivery commitments");
    assert.deepEqual(tasksParsed.items, []);
  });
});

test("storage: create() writes expected root object", async () => {
  await withTempStore(async (context, dbPath) => {
    await lister.create({ list: "tasks", listType: "todos", description: "Delivery commitments" }, context);

    const parsed = await readListFile(dbPath, "tasks");
    assert.deepEqual(parsed, {
      description: "Delivery commitments",
      list_type: "todos",
      items: []
    });
  });
});

test("storage: add() insertion order is persisted with 1-based ids", async () => {
  await withTempStore(async (context, dbPath) => {
    await lister.add({ list: "notes", data: { text: "one" } }, context);
    await lister.add({ list: "notes", data: { text: "two" } }, context);
    await lister.add({ list: "notes", id: 1, data: { text: "zero" } }, context);

    const parsed = await readListFile(dbPath, "notes");
    assert.equal(parsed.list_type, "general");
    assert.equal(parsed.description, "A description of the list");
    assert.equal(parsed.items.length, 3);
    assert.deepEqual(parsed.items.map((item) => ({ id: item.id, text: item.data.text })), [
      { id: 1, text: "zero" },
      { id: 2, text: "one" },
      { id: 3, text: "two" }
    ]);
  });
});

test("storage: update(), remove(), and clear() persist expected item state", async () => {
  await withTempStore(async (context, dbPath) => {
    await lister.create({ list: "tasks", listType: "todos" }, context);
    await lister.add(
      {
        list: "tasks",
        data: { text: "first", due: "2026-05-01T09:00:00Z", status: "open" }
      },
      context
    );
    await lister.add(
      {
        list: "tasks",
        data: { text: "second", due: "2026-05-02T09:00:00Z", status: "open" }
      },
      context
    );

    const beforeUpdate = await readListFile(dbPath, "tasks");
    const oldUpdatedAt = beforeUpdate.items[0].updatedAt;

    await lister.update(
      {
        list: "tasks",
        id: 1,
        data: { text: "first-updated", due: "2026-05-03T09:00:00Z", status: "open" }
      },
      context
    );

    const afterUpdate = await readListFile(dbPath, "tasks");
    assert.equal(afterUpdate.items[0].data.text, "first-updated");
    assert.notEqual(afterUpdate.items[0].updatedAt, oldUpdatedAt);

    await lister.remove({ list: "tasks", id: 1 }, context);
    const afterRemove = await readListFile(dbPath, "tasks");
    assert.deepEqual(afterRemove.items.map((item) => ({ id: item.id, text: item.data.text })), [
      { id: 1, text: "second" }
    ]);

    await lister.clear({ list: "tasks", confirm: true }, context);
    const afterClear = await readListFile(dbPath, "tasks");
    assert.deepEqual(afterClear.items, []);
    assert.equal(afterClear.list_type, "todos");
  });
});

test("storage: LISTER_STORE_FOLDER overrides default storage folder", async () => {
  const storePath = await mkdtemp(join(tmpdir(), "lister-env-store-"));
  const oldValue = process.env.LISTER_STORE_FOLDER;
  process.env.LISTER_STORE_FOLDER = storePath;

  try {
    await lister.create({ list: "env-list", listType: "general" });
    await lister.add({ list: "env-list", data: { text: "from-env" } });

    const parsed = await readListFile(storePath, "env-list");
    assert.equal(parsed.list_type, "general");
    assert.deepEqual(parsed.items.map((item) => item.data.text), ["from-env"]);
  } finally {
    if (oldValue === undefined) {
      delete process.env.LISTER_STORE_FOLDER;
    } else {
      process.env.LISTER_STORE_FOLDER = oldValue;
    }
    await rm(storePath, { recursive: true, force: true });
  }
});

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
