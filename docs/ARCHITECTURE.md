# Architecture

This document is for contributors. It explains how a Lister request moves through the codebase and which modules own which responsibilities.

## High-Level Shape

Lister exposes the same core behavior through two surfaces:

- a framework-neutral TypeScript API in `src/tool.ts`
- an OpenClaw plugin tool in `src/pluginTool.ts`

Both surfaces share the same command classes and services.

## Runtime Flow

### OpenClaw flow

1. OpenClaw loads the plugin entry from `src/index.ts`.
2. The plugin entry registers the Lister tool via `createListerTool()` in `src/pluginTool.ts`.
3. `pluginTool.ts` resolves a runtime store path from the workspace or agent directory.
4. It builds a command registry-backed tool schema.
5. On execution, it validates the `action`, delegates parsing to the command class, and formats the result for tool output.

The important point is that OpenClaw-specific behavior is mostly adapter code. The actual list behavior stays in commands and services.

### Library/API flow

1. A caller imports a function such as `create()` or `items()` from `src/tool.ts`.
2. `runCommand()` resolves the effective store path and refreshes services if the path changed.
3. The `CommandRegisterService` looks up the matching command class.
4. The command parses input through `BaseCommand`.
5. The command executes using shared services.
6. The command returns a deterministic JSON result.

## Module Responsibilities

### `src/index.ts`

- package public entry point
- re-exports the public API and key types
- defines the default OpenClaw plugin entry

### `src/pluginTool.ts`

- translates OpenClaw runtime context into Lister `ToolContext`
- exposes registry-derived tool schema
- formats execution results for tool consumers

If a behavior is specific to plugin runtime wiring, it belongs here instead of in the core services.

### `src/tool.ts`

- bootstraps concrete services
- registers command instances
- dispatches framework-neutral function calls to command classes

This file is the best place to understand the complete command surface in one pass.

### `src/commands/`

Each command has its own file and owns:

- command name
- description
- argument definitions
- parse behavior
- result shaping
- execution logic

Shared command behavior lives in:

- `base/BaseCommand.ts`
- `helpers/commandParseHelpers.ts`
- `helpers/commandSchemaHelpers.ts`

This pattern keeps the command layer uniform and easy to extend.

### `src/services/`

The service layer contains the reusable machinery behind commands.

`Services.ts`

- simple service container for command registry, list-type registry, and store service

`CommandRegisterService.ts`

- owns ordered command registration
- resolves commands by name
- builds the OpenClaw parameter schema from command metadata

`ListTypeRegisterService.ts`

- loads built-in types from `src/builtin-list-types.json`
- loads optional custom types from `lister-store/_config/custom-list-types.json`
- validates and merges the list-type registry
- validates item payloads against a chosen list type

`ListerStoreService.ts`

- reads and writes list files
- validates persisted list-file structure
- manages list/item mutations
- owns positional item ID behavior

## Data Model

Each list is stored as one JSON file under the resolved store directory.

List file shape:

```json
{
  "version": "0.3.0",
  "description": "A description of the list",
  "list_type": "general",
  "items": []
}
```

Each item contains:

- `id`: 1-based positional identifier
- `createdAt`
- `updatedAt`
- `data`: payload matching the list type schema named in the list_type fields

## Validation Boundaries

Understanding the validation split is important for contributors.

### Command-layer validation

Owned by command classes and `BaseCommand`.

Examples:

- required vs optional arguments
- positive integer checks for `id`
- `confirm: true` for destructive clear
- “is this input a JSON object?”

### List-type validation

Owned by `ListTypeRegisterService`.

Examples:

- whether a `list type` input as a command parameter exists eg `todos` or `people` or a custom type
- whether an item payload has the exact required fields given the item's containing list `list_type`
- whether individual field values match `string`, `number`, or `datetime` as per the appropriate `list type` schema

### Store-file validation

Owned by `ListerStoreService`.

Examples:

- file is a JSON object
- `version`, `description`, `list_type`, and `items` have valid persisted shapes
- each stored item has valid metadata

Keeping these boundaries clean makes the code easier to change safely.

## Adding A New Command

Use this checklist:

1. Add the interface in `src/commands/interfaces/` if needed.
2. Add the command class in `src/commands/`.
3. Define argument metadata with `commandArg(...)`.
4. Implement execution in terms of services, not direct filesystem calls from the command.
5. Register the command in `configureServices()` in `src/tool.ts`.
6. Add integration coverage in the relevant file under `test/integration/`.
7. Update user-facing docs if the public contract changed.

## Why The Design Is Like This

The code favors explicit indirection over hidden framework magic:

- command metadata is close to command behavior
- OpenClaw integration stays thin
- persistence rules stay in one place
- list-type rules stay in one place

That keeps the system predictable for both contributors and agents using the tool.
