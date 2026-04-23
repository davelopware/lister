# OpenClaw Plugin TODO

## Critical Path

- [x] Replace the current library-style entrypoint with a real native OpenClaw plugin entry module.
  - `package.json` already points `openclaw.extensions` at `./dist/index.js`.
  - That built file needs to `export default` a plugin entry object created with the OpenClaw SDK.
  - The entry should register Lister as an OpenClaw tool via `register(api)`.

- [x] Add the OpenClaw plugin SDK dependency and switch runtime imports to the documented SDK subpaths.
  - Use narrow imports such as `openclaw/plugin-sdk/plugin-entry`.
  - Confirm the package builds cleanly with those imports in compiled output.

- [x] Define the actual tool registration shape for OpenClaw runtime.
  - Decide whether Lister is exposed as one multi-action tool or multiple narrower tools.
  - Map current operations (`listTypes`, `create`, `lists`, `add`, `items`, `remove`, `update`, `clear`, `status`) into the OpenClaw tool contract.
  - Keep the existing function API intact unless there is a strong reason to split it.

## Packaging

- [x] Add external-plugin compatibility metadata under `package.json > openclaw`.
  - Add `compat` metadata for supported plugin API / gateway versions.
  - Add `build` metadata for the OpenClaw / plugin SDK version used to build the package.

- [x] Confirm the dependency tree is safe for OpenClaw install behavior.
  - OpenClaw installs npm plugins with `npm install --ignore-scripts`.
  - Avoid dependencies that require `postinstall`, native compilation, or generated artifacts at install time.

- [x] Keep the published package layout aligned with native plugin expectations.
  - Root `openclaw.plugin.json`
  - `package.json` with `openclaw.extensions`
  - Built runtime in `dist/`
  - Plugin-bundled skills under `openclaw/skills/`

## Validation

- [x] Test installation from a local package artifact with OpenClaw.
  - Build/package with `npm pack`
  - Install with `openclaw plugins install ./lister-<version>.tgz`
  - Confirm detection succeeds

- [x] Verify plugin discovery and runtime registration in OpenClaw.
  - Check `openclaw plugins list`
  - Check `openclaw plugins inspect lister`
  - Restart the gateway if required
  - Confirm the tool is actually available to an agent session

- [ ] Validate failure modes and diagnostics.
  - Broken config should fail cleanly
  - Missing manifest / bad entrypoint should produce understandable errors
  - Tool registration errors should be visible through OpenClaw diagnostics

- [ ] Add a command to modify an existing list description.
  - Support updating the stored `description` for a named list without recreating it.
  - Expose the capability through the tool contract alongside the other list management actions.

- [ ] Add a command to remove a list entirely.
  - Support deleting a named list and all of its stored items in one operation.
  - Expose the capability through the tool contract as a distinct destructive action with clear confirmation-oriented messaging.

- [ ] Add a search facility for list items.
  - Decide whether this should be an optional `search` parameter on `items` or a separate `search` command.
  - Start with simple text matching across any item field within a single list.
  - Return the matching items only; do not require schema-specific search behavior in v1.

## Extensible List Type Schemas

Allow opinionated list type schemas to be defined from configuration rather than hardcoded in TypeScript, while preserving the built-in defaults.
The goal is to make schema policy easier to evolve, let users add their own list types safely through a predictable file-based extension point,
and keep runtime/tooling validation aligned with the merged registry of built-in and user-defined types.

Example custom schema file shape:

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
          "description": "Renewal date in ISO 8601 format where possible"
        }
      ]
    }
  ]
}
```

- [x] Move built-in list type definitions out of code and into an internal bundled config file.
  - Keep the built-in registry shipped with the package as the default source of truth.
  - Replace hand-authored schema metadata in `src/list-types.ts` with loader-backed definitions.

- [x] Add a runtime registry loader that merges built-in types with an optional user-defined config file.
  - Treat extension of the internal built-ins as implicit; do not require an explicit `extends` field.
  - Use a simple file shape with a top-level `types` array.
  - Load custom types from one predictable location rather than user-authored relative import chains.

- [x] Standardise schema field definitions around a small supported type system.
  - Support `string`, `number`, and `datetime` as the initial field types.
  - Use the literal schema type name `datetime` in config and bundled metadata; do not spell it as `datetime string`.
  - Document `datetime` values as parseable timestamps, with ISO 8601 recommended where possible.
  - Keep validation behavior aligned with the current parser semantics unless a stricter format is intentionally introduced.

- [x] Replace the hardcoded closed set of list types with runtime validation against the loaded registry.
  - Remove the dependency on a fixed `ListerListType` union for create/add/update flows.
  - Update store-level `list_type` validation to accept any loaded registry type name.
  - Keep invalid or unknown types failing with clear error messages.

- [x] Loosen the OpenClaw tool contract so custom list types can be passed through at runtime.
  - Change `listType` from an enum-like contract to a string validated by the registry.
  - Keep `listTypes()` as the discovery mechanism for available built-in and user-defined types.
  - Update any plugin-bundled manifests or prompts that currently describe a fixed built-in set.

- [x] Define safe merge behavior for user-defined types.
  - Reject duplicate type names by default so extension stays additive in v1.
  - Fail fast on invalid config files with actionable diagnostics.
  - Make merged type discovery visible through `listTypes()`.

- [x] Add regression and extension coverage in integration tests.
  - No custom config should preserve current built-in behavior.
  - A valid custom config should allow create/add/update for a new type.
  - Duplicate names and malformed config should fail clearly.
  - Stored lists using custom types should round-trip correctly.

## Optional Follow-Up

- [ ] Add `openclaw.install` hints in `package.json` if we want better install/update ergonomics.

- [ ] Decide whether this should be published only to npm or also prepared for ClawHub package publishing.

- [ ] If ClawHub publication is a goal, add the required publish-baseline metadata and run a dry-run publish validation.

## Refactor Architecture To Command Classes

Refactor the command surface so each command is represented by its own class, with the class owning the command name, description, parameter definitions,
argument parsing/validation, parse-error response building, and execution logic.

- [ ] Create interface files first, each in its own file with an `I` prefix.
  - Examples: `IListerCommand.ts`, `ICommandRegistry.ts`, `ICommandParseResult.ts`, `ICommandExecutionContext.ts`, `IShowCommandsCommand.ts`, `ICreateCommand.ts`.
  - Each concrete class should live in its own matching non-`I` file, for example `ShowCommandsCommand.ts` implementing `IShowCommandsCommand`.

- [ ] Define a base command contract.
  - `IListerCommand<TParsed>` should cover command identity, `canHandle(commandName: string): boolean`, command metadata, parameter metadata, `parse`, parse-error response building, and `execute`.

- [ ] Add a command registry class and interface.
  - `ICommandRegistry` should live in its own file.
  - `CommandRegistry` should hold ordered command instances and iterate through them, asking `canHandle()` until one matches.
  - `CommandRegistry` should generate the OpenClaw schema from command class metadata.
  - `ShowCommandsCommand` and `CommandArgsCommand` should receive `ICommandRegistry` in their constructors so they can interrogate it.

- [ ] Move each command into its own class file.
  - One file per command: `ShowCommandsCommand`, `CommandArgsCommand`, `ShowListTypesCommand`, `ListTypeSchemaCommand`, `CreateCommand`, `ListsCommand`, `AddCommand`, `ItemsCommand`, `RemoveCommand`, `UpdateCommand`, `ClearCommand`, `StatusCommand`.
  - Do not keep support for legacy command names; each command class should only accept its current command name.

- [ ] Keep shared helpers outside command classes.
  - Shared parsing helpers, response builders, and runtime context helpers should live outside the commands.
  - `ListerStore` should remain a class wrapping access to the store files, not command metadata or command parsing.

- [ ] Keep `ListerStore` responsible for persisted list-file parsing, not typed command payload parsing.
  - `ListerStore` should read/write list files, validate stored file structure, and provide basic list/item persistence operations.
  - Typed `add` / `update` payload parsing against list-type schemas should remain in a separate shared service/helper layer.

- [ ] Refactor `plugin-tool.ts` into a thin adapter.
  - It should resolve runtime context, extract the command name, ask the registry to find a handler, call `parse`, return command-built parse errors on failure, and call `execute` on success.
  - The OpenClaw schema should come from the registry rather than hardcoded per-action branches in `plugin-tool.ts`.

- [ ] Remove duplicated command metadata after migration.
  - Command name, description, and argument definitions should live only in command classes.
  - `showCommands`, `commandArgs`, and OpenClaw schema generation should all derive from the command registry and command instances.

- [ ] Migrate incrementally.
  - Phase 1: interfaces, registry, shared helpers, and command execution context.
  - Phase 2: implement introspection commands first.
  - Phase 3: migrate CRUD commands one by one.
  - Phase 4: switch tool dispatch to the registry.
  - Phase 5: delete old flat command definitions and redundant validation.
