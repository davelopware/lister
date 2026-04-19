# lister

Simple, fast, opinionated list management for agentic workflows.

## OpenClaw Plugin

This repository is being prepared as a native OpenClaw plugin package.

Today it already ships:

- a native plugin manifest at `openclaw.plugin.json`
- OpenClaw skills under `openclaw/skills/`
- an OpenClaw tool manifest at `openclaw/tools/lister.tool.json`
- package metadata in `package.json` for native plugin discovery

Current limitation: the runtime plugin entry is not wired up yet, so this package is not yet a complete installable OpenClaw plugin.

## Library Usage

Lister exposes a TypeScript function API for direct invocation with deterministic JSON results.

### Repo-local usage

Build first:

```bash
npm install
npm run build
```

Then import from the compiled output:

```ts
import { add, create, items, listTypes, lists, stats, update } from "./dist/tool.js";

const supported = await listTypes();

await create({
  list: "tasks",
  listType: "todos",
  description: "Delivery commitments"
});

const knownLists = await lists();
// knownLists.lists => [{ name, list_type, description }]

await add({
  list: "tasks",
  data: { text: "ship v1", due: "2026-05-01T09:00:00Z", status: "open" }
});

const openItems = await items({
  list: "tasks",
  limit: 20
});

await update({
  list: "tasks",
  id: 1,
  data: { text: "ship v1.1", due: "2026-05-03T09:00:00Z", status: "open" }
});

const summary = await stats();
```

Supported operations:

- `listTypes()`
- `create(input)`
- `lists()`
- `add(input)`
- `items(input)`
- `remove(input)`
- `update(input)`
- `clear(input)`
- `stats()`

Optional: set a custom database location.

```bash
export LISTER_STORE_FOLDER="/tmp/lister-lists"
```

Default path is `./lister-store` relative to the current working directory where Lister is invoked.

List name restriction: 1-64 chars, lowercase `a-z`, `0-9`, `-`, `_`; must start with `a-z` or `0-9`.

Each list is stored in its own JSON file. Every list file has this root schema:

```json
{
  "description": "A description of the list",
  "list_type": "general",
  "items": []
}
```

## List Types

- `general`: each item must be `{ "text": string }`
- `todos`: each item must be `{ "text": string, "due": datetime-string, "status": string }`
- `people`: each item must be `{ "nickname", "name", "email", "phone", "relation", "birthday", "additional" }` (all string fields)
- `habits`: each item must be `{ "habit", "frequency", "target", "last_completed", "streak", "notes" }`
- `shopping-items`: each item must be `{ "item", "quantity", "category", "store", "budget", "status" }`
- `health-log`: each item must be `{ "metric", "value", "unit", "recorded_at", "context", "notes" }`
- `waiting-on`: each item must be `{ "subject", "owner", "requested_at", "due_by", "status", "next_follow_up" }`

## Behavior

- Every item has a positional numeric `id` (1-based, top-to-bottom order in file).
- `add(input)` appends to the end when `id` is omitted, or inserts at `id` and shifts items below down by one.
- If `add(input)` receives an `id` beyond the current end, the item is appended and assigned the next position id.
- `remove({ list, id })` removes by position id and reindexes items below.
- Every item has `createdAt` and `updatedAt`.
- `status` remains valid inside `data` for list types that include it, for example `todos`.
- Destructive clear requires explicit confirmation (`confirm: true` in function mode).

## Development

Install dependencies:

```bash
npm install
```

Build:

```bash
npm run build
```

Run repeatable integration tests:

```bash
npm test
```

Create a package artifact:

```bash
npm pack
```

Tests live in `test/integration.test.mjs` and validate file schema plus core list lifecycle behavior.
