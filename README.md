# lister

Simple, fast, opinionated list management for agentic workflows.

## OpenClaw Plugin

This repository is being prepared as a native OpenClaw plugin package.

Today it already ships:

- a native plugin manifest at `openclaw.plugin.json`
- OpenClaw skills under `openclaw/skills/`
- an OpenClaw tool manifest at `openclaw/tools/lister.tool.json`
- package metadata in `package.json` for native plugin discovery

The runtime plugin entry is wired up through `./dist/index.js` and registers Lister as a native OpenClaw tool.

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
import { add, create, items, listTypes, lists, status, update } from "./dist/tool.js";

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

const summary = await status();
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
- `status()`

Optional: set a custom database location.

```bash
export LISTER_STORE_FOLDER="/tmp/lister-lists"
```

Default path is `./lister-store` relative to the current working directory where Lister is invoked.
`status()` also reports the resolved full store path and whether that store directory exists yet.
Optional custom list types are loaded from `./lister-store/_config/custom-list-types.json` by default, or from `_config/custom-list-types.json` under the overridden `LISTER_STORE_FOLDER`.

List name restriction: 1-64 chars, lowercase `a-z`, `0-9`, `-`, `_`; must start with `a-z` or `0-9`.

Each list is stored in its own JSON file. Every list file has this root schema:

```json
{
  "version": "0.2.0",
  "description": "A description of the list",
  "list_type": "general",
  "items": []
}
```

`version` is the Lister package version that created the file schema.

## List Types

`listTypes()` is the source of truth for the active merged registry of built-in and user-defined types.

- `general`: each item must be `{ "text": string }`
- `todos`: each item must be `{ "text": string, "due": datetime, "status": string }`
- `people`: each item must be `{ "nickname", "name", "email", "phone", "relation", "birthday", "additional" }` (all string fields)
- `habits`: each item must be `{ "habit", "frequency", "target", "progress", "last_completed", "streak", "notes" }`
- `shopping-items`: each item must be `{ "item", "quantity", "category", "store", "budget", "status" }`
- `health-log`: each item must be `{ "metric", "value", "unit", "recorded_at", "context", "notes" }`
- `waiting-on`: each item must be `{ "subject", "owner", "requested_at", "due_by", "status", "next_follow_up" }`

Custom type file shape:

```json
{
  "types": [
    {
      "name": "vendors",
      "purpose": "Track suppliers and commercial contacts.",
      "fields": [
        {
          "name": "name",
          "type": "string",
          "description": "Vendor name"
        },
        {
          "name": "owner",
          "type": "string",
          "description": "Internal owner"
        },
        {
          "name": "renewal_date",
          "type": "datetime",
          "description": "Renewal date in parseable ISO 8601 format where possible"
        }
      ]
    }
  ]
}
```

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

Release flow:

1. Run the controlled release script with the target version:

```bash
npm run release -- <x.y.z>
```

`release` requires a clean tracked worktree, updates `package.json` to the requested version, commits the version bump before tagging, runs `npm pack` (which also runs the test/build flow through `prepack`), verifies the tarball exists, confirms `prepack` did not modify tracked files, pushes the branch and tag, and then creates the GitHub release.

Tests live in `test/integration.test.mjs` and validate file schema plus core list lifecycle behavior.
