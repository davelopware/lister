import test from "node:test";
import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import * as lister from "../dist/tool.js";
import pluginEntry, { LISTER_PACKAGE_VERSION } from "../dist/index.js";
import { createListerTool } from "../dist/plugin-tool.js";

const listerVersion = LISTER_PACKAGE_VERSION;

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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

async function writeListTypesConfig(dbPath, config) {
  const configDir = join(dbPath, "_config");
  await mkdir(configDir, { recursive: true });
  await writeFile(join(configDir, "custom-list-types.json"), `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

async function writeRawListTypesConfig(dbPath, raw) {
  const configDir = join(dbPath, "_config");
  await mkdir(configDir, { recursive: true });
  await writeFile(join(configDir, "custom-list-types.json"), raw, "utf8");
}

function collectProductionPackages(lock) {
  const packages = lock.packages ?? {};
  const root = packages[""] ?? {};
  const pending = Object.keys(root.dependencies ?? {});
  const seen = new Set();
  const resolved = [];

  while (pending.length > 0) {
    const name = pending.pop();
    if (!name || seen.has(name)) {
      continue;
    }
    seen.add(name);

    const pkg = packages[`node_modules/${name}`];
    if (!pkg) {
      continue;
    }

    resolved.push({ name, pkg });
    for (const depName of Object.keys(pkg.dependencies ?? {})) {
      if (!seen.has(depName)) {
        pending.push(depName);
      }
    }
  }

  return resolved.sort((left, right) => left.name.localeCompare(right.name));
}

test("showCommands(): returns the available commands with descriptions", async () => {
  const result = await lister.showCommands();
  assert.equal(result.ok, true);
  assert.equal(result.count, 12);

  const names = result.commands.map((entry) => entry.name).sort();
  assert.deepEqual(names, [
    "add",
    "clear",
    "commandArgs",
    "create",
    "items",
    "listTypeSchema",
    "lists",
    "remove",
    "showCommands",
    "showListTypes",
    "status",
    "update"
  ]);

  const add = result.commands.find((entry) => entry.name === "add");
  assert.equal(!!add, true);
  assert.match(add.description, /Add an item/);
});

test("commandArgs(): returns required and optional args for a command", async () => {
  const result = await lister.commandArgs({ commandName: "add" });
  assert.equal(result.ok, true);
  assert.equal(result.commandName, "add");
  assert.deepEqual(
    result.requiredArgs.map((entry) => entry.name),
    ["list", "data"]
  );
  assert.deepEqual(
    result.optionalArgs.map((entry) => entry.name),
    ["id"]
  );
});

test("showListTypes(): returns all supported type names with descriptions only", async () => {
  const result = await lister.showListTypes();
  assert.equal(result.ok, true);
  assert.equal(result.count, 7);

  const names = result.listTypes.map((entry) => entry.name).sort();
  assert.deepEqual(names, ["general", "habits", "health-log", "people", "shopping-items", "todos", "waiting-on"]);

  const todos = result.listTypes.find((entry) => entry.name === "todos");
  assert.equal(!!todos, true);
  assert.equal(typeof todos.description, "string");
  assert.equal("fields" in todos, false);
});

test("listTypeSchema(): returns the field schema for one list type", async () => {
  const result = await lister.listTypeSchema({ listTypeName: "todos" });
  assert.equal(result.ok, true);
  assert.equal(result.listTypeName, "todos");
  assert.deepEqual(
    result.fields.map((field) => field.name),
    ["text", "due", "status"]
  );
});

test("showListTypes(): merges custom types from store config", async () => {
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

    const result = await lister.showListTypes(context);
    assert.equal(result.ok, true);
    assert.equal(result.count, 8);

    const vendors = result.listTypes.find((entry) => entry.name === "vendors");
    assert.equal(vendors.name, "vendors");
    assert.equal(typeof vendors.description, "string");
  });
});

test("default plugin entry: registers the lister tool", async () => {
  assert.equal(pluginEntry.id, "lister");
  assert.equal(pluginEntry.name, "Lister");
  assert.equal(typeof pluginEntry.register, "function");

  const registered = [];
  pluginEntry.register({
    registerTool(tool, opts) {
      registered.push({ tool, opts });
    }
  });

  assert.equal(registered.length, 1);
  assert.deepEqual(registered[0].opts, { names: ["lister"] });
  assert.equal(typeof registered[0].tool, "function");

  const runtimeTool = registered[0].tool({ workspaceDir: "/tmp/lister-workspace" });
  assert.equal(runtimeTool.name, "lister");
  assert.equal(runtimeTool.executionMode, "sequential");
  assert.equal(typeof runtimeTool.execute, "function");
});

test("lister tool: uses workspace-scoped storage and preflight validation", async () => {
  const workspaceDir = await mkdtemp(join(tmpdir(), "lister-workspace-"));
  try {
    const tool = createListerTool({ workspaceDir });

    const missingList = await tool.execute("call-1", { action: "create" });
    assert.equal(missingList.details.ok, false);
    assert.equal(missingList.details.error, "list is required");

    const created = await tool.execute("call-2", {
      action: "create",
      list: "tasks",
      listType: "todos",
      description: "Workspace scoped"
    });
    assert.equal(created.details.ok, true);

    const stored = await readListFile(join(workspaceDir, "lister-store"), "tasks");
    assert.equal(stored.description, "Workspace scoped");
    assert.equal(stored.list_type, "todos");
  } finally {
    await rm(workspaceDir, { recursive: true, force: true });
  }
});

test("lister tool: status output starts with store path and existence", async () => {
  const workspaceDir = await mkdtemp(join(tmpdir(), "lister-workspace-"));
  try {
    const tool = createListerTool({ workspaceDir });
    const result = await tool.execute("call-status", { action: "status" });
    const output = result.content[0]?.text ?? "";

    assert.match(
      output,
      new RegExp(`^Lister version: ${escapeRegex(listerVersion)}\\nLister store: .+lister-store \\((exists|does not exist yet)\\)\\n\\{`)
    );
    assert.equal(result.details.ok, true);
    assert.equal(result.details.extension_version, listerVersion);
    assert.equal(result.details.store_path, join(workspaceDir, "lister-store"));
    assert.equal(result.details.store_exists, false);
    assert.equal(result.details.custom_list_types_path, join(workspaceDir, "lister-store", "_config", "custom-list-types.json"));
    assert.equal(result.details.custom_list_types_exists, false);
  } finally {
    await rm(workspaceDir, { recursive: true, force: true });
  }
});

test("package contract: runtime deps and SDK subpath import stay aligned", async () => {
  const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  const lock = JSON.parse(await readFile(new URL("../package-lock.json", import.meta.url), "utf8"));
  const builtEntry = await readFile(new URL("../dist/index.js", import.meta.url), "utf8");
  const builtTool = await readFile(new URL("../dist/plugin-tool.js", import.meta.url), "utf8");
  const productionPackages = collectProductionPackages(lock);

  assert.equal(pkg.dependencies["@sinclair/typebox"], "^0.34.49");
  assert.equal(pkg.devDependencies.openclaw, "^2026.4.15");
  assert.equal(pkg.dependencies.openclaw, undefined);
  assert.deepEqual(
    productionPackages.map((entry) => entry.name),
    ["@sinclair/typebox"]
  );
  for (const entry of productionPackages) {
    assert.equal(entry.pkg.hasInstallScript, undefined, `${entry.name} should not require npm lifecycle scripts`);
    assert.equal(entry.pkg.gypfile, undefined, `${entry.name} should not require native compilation`);
    assert.equal(entry.pkg.requiresBuild, undefined, `${entry.name} should not require generated build artifacts`);
  }
  assert.deepEqual(pkg.openclaw.compat, {
    pluginApiRange: ">=2026.4.15 <2027.0.0",
    minGatewayVersion: "2026.4.15"
  });
  assert.deepEqual(pkg.openclaw.build, {
    builtWithOpenClawVersion: "2026.4.15",
    pluginSdkVersion: "2026.4.15"
  });
  assert.deepEqual(pkg.openclaw.install, {
    minHostVersion: ">=2026.4.15"
  });
  assert.match(builtEntry, /openclaw\/plugin-sdk\/plugin-entry/);
  assert.match(builtTool, /@sinclair\/typebox/);
});

test("package layout: publish shape matches native plugin expectations", async () => {
  const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  const manifest = JSON.parse(await readFile(new URL("../openclaw.plugin.json", import.meta.url), "utf8"));
  const skillEntries = await readdir(new URL("../openclaw/skills", import.meta.url), { withFileTypes: true });

  await access(new URL("../dist/index.js", import.meta.url));
  await access(new URL("../dist/builtin-list-types.json", import.meta.url));
  await access(new URL("../openclaw/tools/lister.tool.json", import.meta.url));

  assert.equal(manifest.id, "lister");
  assert.deepEqual(pkg.openclaw.extensions, ["./dist/index.js"]);
  assert.deepEqual(
    pkg.files,
    ["dist", "openclaw", "openclaw.plugin.json", "README.md"]
  );
  assert.equal(skillEntries.some((entry) => entry.isDirectory() && entry.name === "lister"), true);
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

test("custom list types: create, add, and update use the merged registry", async () => {
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

    const created = await lister.create({ list: "suppliers", listType: "vendors" }, context);
    assert.equal(created.ok, true);
    assert.equal(created.list_type, "vendors");

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

test("custom list types: duplicate names fail fast", async () => {
  await withTempStore(async (context, dbPath) => {
    await writeListTypesConfig(dbPath, {
      types: [
        {
          name: "todos",
          purpose: "Duplicate built-in",
          fields: [{ name: "text", type: "string", description: "Text" }]
        }
      ]
    });

    await assert.rejects(
      () => lister.showListTypes(context),
      /Duplicate list type "todos"/
    );
  });
});

test("custom list types: malformed config fails clearly", async () => {
  await withTempStore(async (context, dbPath) => {
    await writeRawListTypesConfig(dbPath, "{\n  \"types\": [\n");

    await assert.rejects(
      () => lister.showListTypes(context),
      /Invalid list type config at .*custom-list-types\.json:/
    );
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

test("status(): returns store path, existence, and aggregate counts across lists", async () => {
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

    const status = await lister.status(context);
    assert.equal(status.ok, true);
    assert.equal(status.extension_version, listerVersion);
    assert.equal(status.store_path, context.dbPath);
    assert.equal(status.store_exists, true);
    assert.equal(status.custom_list_types_path, join(context.dbPath, "_config", "custom-list-types.json"));
    assert.equal(status.custom_list_types_exists, false);
    assert.equal(status.lists, 2);
    assert.equal(status.items, 2);
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
    assert.equal(tasksParsed.version, listerVersion);
    assert.deepEqual(tasksParsed.items, []);
  });
});

test("storage: create() writes expected root object", async () => {
  await withTempStore(async (context, dbPath) => {
    await lister.create({ list: "tasks", listType: "todos", description: "Delivery commitments" }, context);

    const parsed = await readListFile(dbPath, "tasks");
    assert.deepEqual(parsed, {
      version: listerVersion,
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
    assert.equal(parsed.version, listerVersion);
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
    assert.equal(afterClear.version, listerVersion);
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
    assert.equal(parsed.version, listerVersion);
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
