import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { LISTER_PACKAGE_VERSION } from "../../../dist/index.js";
import { ListTypeRegisterService } from "../../../dist/services/ListTypeRegisterService.js";
import { ListerStoreService } from "../../../dist/services/ListerStoreService.js";
import { readListFile } from "../helpers/testHelpers.mjs";

async function withStore(run) {
  const dbPath = await mkdtemp(join(tmpdir(), "lister-store-service-"));
  try {
    const listTypes = new ListTypeRegisterService(dbPath);
    const store = new ListerStoreService(dbPath, listTypes);
    await run({ dbPath, listTypes, store });
  } finally {
    await rm(dbPath, { recursive: true, force: true });
  }
}

test("ListerStoreService: createList() writes the expected root object", async () => {
  await withStore(async ({ dbPath, store }) => {
    await store.createList("tasks", { listType: "todos", description: "Delivery commitments" });

    const parsed = await readListFile(dbPath, "tasks");
    assert.deepEqual(parsed, {
      version: LISTER_PACKAGE_VERSION,
      description: "Delivery commitments",
      list_type: "todos",
      items: []
    });
  });
});

test("ListerStoreService: add() persists insertion order with 1-based ids", async () => {
  await withStore(async ({ dbPath, store }) => {
    await store.add("notes", { text: "one" });
    await store.add("notes", { text: "two" });
    await store.add("notes", { text: "zero" }, 1);

    const parsed = await readListFile(dbPath, "notes");
    assert.equal(parsed.version, LISTER_PACKAGE_VERSION);
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

test("ListerStoreService: update(), remove(), and clear() persist expected item state", async () => {
  await withStore(async ({ dbPath, store }) => {
    await store.createList("tasks", { listType: "todos" });
    await store.add("tasks", { text: "first", due: "2026-05-01T09:00:00Z", status: "open" });
    await store.add("tasks", { text: "second", due: "2026-05-02T09:00:00Z", status: "open" });

    const beforeUpdate = await readListFile(dbPath, "tasks");
    const oldUpdatedAt = beforeUpdate.items[0].updatedAt;

    await store.update("tasks", 1, { text: "first-updated", due: "2026-05-03T09:00:00Z", status: "open" });

    const afterUpdate = await readListFile(dbPath, "tasks");
    assert.equal(afterUpdate.items[0].data.text, "first-updated");
    assert.notEqual(afterUpdate.items[0].updatedAt, oldUpdatedAt);

    await store.remove("tasks", 1);
    const afterRemove = await readListFile(dbPath, "tasks");
    assert.deepEqual(afterRemove.items.map((item) => ({ id: item.id, text: item.data.text })), [
      { id: 1, text: "second" }
    ]);

    await store.clear("tasks");
    const afterClear = await readListFile(dbPath, "tasks");
    assert.deepEqual(afterClear.items, []);
    assert.equal(afterClear.version, LISTER_PACKAGE_VERSION);
    assert.equal(afterClear.list_type, "todos");
  });
});
