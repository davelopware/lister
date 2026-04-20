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

## Extensible List Type Schemas

- [ ] Move built-in list type definitions out of code and into an internal bundled config file.
  - Keep the built-in registry shipped with the package as the default source of truth.
  - Replace hand-authored schema metadata in `src/list-types.ts` with loader-backed definitions.

- [ ] Add a runtime registry loader that merges built-in types with an optional user-defined config file.
  - Treat extension of the internal built-ins as implicit; do not require an explicit `extends` field.
  - Use a simple file shape with a top-level `types` array.
  - Load custom types from one predictable location rather than user-authored relative import chains.

- [ ] Standardise schema field definitions around a small supported type system.
  - Support `string`, `number`, and `datetime` as the initial field types.
  - Document `datetime` values as parseable timestamps, with ISO 8601 recommended where possible.
  - Keep validation behavior aligned with the current parser semantics unless a stricter format is intentionally introduced.

- [ ] Replace the hardcoded closed set of list types with runtime validation against the loaded registry.
  - Remove the dependency on a fixed `ListerListType` union for create/add/update flows.
  - Update store-level `list_type` validation to accept any loaded registry type name.
  - Keep invalid or unknown types failing with clear error messages.

- [ ] Loosen the OpenClaw tool contract so custom list types can be passed through at runtime.
  - Change `listType` from an enum-like contract to a string validated by the registry.
  - Keep `listTypes()` as the discovery mechanism for available built-in and user-defined types.
  - Update any plugin-bundled manifests or prompts that currently describe a fixed built-in set.

- [ ] Define safe merge behavior for user-defined types.
  - Reject duplicate type names by default so extension stays additive in v1.
  - Fail fast on invalid config files with actionable diagnostics.
  - Make merged type discovery visible through `listTypes()`.

- [ ] Add regression and extension coverage in integration tests.
  - No custom config should preserve current built-in behavior.
  - A valid custom config should allow create/add/update for a new type.
  - Duplicate names and malformed config should fail clearly.
  - Stored lists using custom types should round-trip correctly.

## Optional Follow-Up

- [ ] Add `openclaw.install` hints in `package.json` if we want better install/update ergonomics.

- [ ] Decide whether this should be published only to npm or also prepared for ClawHub package publishing.

- [ ] If ClawHub publication is a goal, add the required publish-baseline metadata and run a dry-run publish validation.
