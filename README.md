# lister

Simple, fast, efficient, and opinionated list management for agentic AI workflows.

## What you get

- TypeScript function API for direct tool invocation (no shell command parsing required).
- Deterministic JSON output for easy machine parsing.
- OpenClaw assets:
  - Tool manifest at `openclaw/tools/lister.tool.json`
  - Skill file at `openclaw/skills/lister.skill.md`

## Quick start

```bash
npm install
npm run build
```

## Testing

Run repeatable integration tests:

```bash
npm test
```

Tests live in `test/integration.test.mjs` and validate file schema plus core list lifecycle behavior.

Optional: set a custom database location.

```bash
export LISTER_STORE_FOLDER="/tmp/lister-lists"
```

Default path is `./lister-store` relative to the current working directory where lister is invoked.

List name restriction: 1-64 chars, lowercase `a-z`, `0-9`, `-`, `_`; must start with `a-z` or `0-9`.

Each list is stored in its own JSON file. Every list file has this root schema:

```json
{
  "description": "A description of the list",
  "list_type": "general",
  "items": []
}
```

## Opinionated List Types

- `general`: each item must be `{ "text": string }`
- `todos`: each item must be `{ "text": string, "due": datetime-string, "status": string }`
- `people`: each item must be `{ "nickname", "name", "email", "phone", "relation", "birthday", "additional" }` (all string fields)
- `habits`: each item must be `{ "habit", "frequency", "target", "last_completed", "streak", "notes" }`
- `shopping-items`: each item must be `{ "item", "quantity", "category", "store", "budget", "status" }`
- `health-log`: each item must be `{ "metric", "value", "unit", "recorded_at", "context", "notes" }`
- `waiting-on`: each item must be `{ "subject", "owner", "requested_at", "due_by", "status", "next_follow_up" }`

## Direct Function Usage

Import from the compiled module:

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

const added = await add({
  list: "tasks",
  data: { text: "ship v1", due: "2026-05-01T09:00:00Z", status: "open" }
});

await add({
  list: "tasks",
  id: 1,
  data: { text: "urgent item", due: "2026-04-20T09:00:00Z", status: "open" }
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

## Opinionated behavior

- Every item has a positional numeric `id` (1-based, top-to-bottom order in file).
- `add(input)` appends to the end when `id` is omitted, or inserts at `id` and shifts items below down by one.
- If `add(input)` receives an `id` beyond the current end, the item is appended and assigned the next position id.
- `remove({ list, id })` removes by position id and reindexes items below.
- Every item has `createdAt` and `updatedAt`.
- `status` remains valid inside `data` for list types that include it (for example `todos`).
- Destructive clear requires explicit confirmation (`confirm: true` in function mode).
