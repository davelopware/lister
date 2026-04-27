# lister

Simple, fast, opinionated list management for agentic workflows.

## OpenClaw Plugin

Lister is primarily structured as a native OpenClaw plugin.

In practice that means:

- OpenClaw loads the package through the plugin entry exported from `src/index.ts`
- the plugin registers one tool, `lister`
- that tool exposes a small command surface for creating lists, inspecting them, and mutating items
- list data is persisted locally in a `lister-store` directory scoped to the current workspace or agent runtime context

The project is deliberately split so the OpenClaw-specific integration stays thin. The core behavior lives in the shared TypeScript command and service layers, which means the same internal machinery can also support direct library usage and future surfaces such as a CLI if needed.

## High-Level Concepts

There are a few core concepts worth understanding before reading the code.

### 1. One Tool, Many Commands

Lister is exposed to OpenClaw as a single tool with an `action` field. That action maps to a command such as:

- `commandGetAll`
- `typeGetAll`
- `listCreate`
- `listsGet`
- `listRemove`
- `itemCreate`
- `itemGetAll`
- `itemUpdate`
- `itemRemove`
- `listClear`
- `status`

Each command lives in its own file under `src/commands/` and owns its own metadata, argument parsing, and execution logic.

### 2. Typed Lists

Every list has a `list_type`. The list type defines the shape of the item payload stored in that list.

Built-in types live in `src/builtin-list-types.json`. Optional custom types can be loaded at runtime from:

`lister-store/_config/custom-list-types.json`

This keeps item schemas explicit and predictable instead of turning every list into an unstructured blob.

### 3. Local File-Backed Storage

Lister stores data as JSON files on disk rather than in an external database.

- each list is one JSON file
- item IDs are 1-based positional identifiers
- the store path is resolved from runtime context, `LISTER_STORE_FOLDER`, or the current working directory

That makes the tool easy to inspect, easy to move between environments, and deterministic in tests.

### 4. Clear Separation Of Responsibilities

The codebase is organized so the major layers stay narrow:

- `src/index.ts`: package entry point and OpenClaw plugin registration
- `src/pluginTool.ts`: OpenClaw adapter, tool schema, and runtime context resolution
- `src/tool.ts`: framework-neutral command dispatch and service bootstrap
- `src/commands/`: one class per command
- `src/services/`: persistence, list-type registry, command registry, and service container

That split is the main thing that makes the codebase easy to extend without introducing hidden coupling.

## How A Request Flows

At a high level, a Lister request works like this:

1. OpenClaw invokes the `lister` tool with an `action`.
2. `src/pluginTool.ts` resolves the runtime store path and finds the command for that action.
3. The command parses and validates its input through `BaseCommand`.
4. The command uses shared services to perform the requested operation.
5. The result is returned as deterministic JSON.

The same command and service layer is also used by the direct TypeScript API in `src/tool.ts`.

## For Contributors

Start here if you want to understand or extend the codebase:

- [`CONTRIBUTING.md`](./CONTRIBUTING.md): local setup, repo map, and change workflow
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md): request flow and module responsibilities
- [`test/integration/`](./test/integration/): end-to-end behavior contract


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

`release` requires a clean tracked worktree, updates `package.json`, `openclaw.plugin.json`, and `openclaw/tools/lister.tool.json` to the requested version, commits the version bump before tagging, runs `npm pack` (which also runs the test/build flow through `prepack`), verifies the tarball exists, confirms `prepack` did not modify tracked files, pushes the branch and tag, and then creates the GitHub release.

Tests live under `test/integration/` and validate command behavior, service behavior, plugin wiring, package layout, and core storage lifecycle behavior.
