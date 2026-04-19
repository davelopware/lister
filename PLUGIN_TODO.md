# OpenClaw Plugin TODO

## Critical Path

- [ ] Replace the current library-style entrypoint with a real native OpenClaw plugin entry module.
  - `package.json` already points `openclaw.extensions` at `./dist/index.js`.
  - That built file needs to `export default` a plugin entry object created with the OpenClaw SDK.
  - The entry should register Lister as an OpenClaw tool via `register(api)`.

- [ ] Add the OpenClaw plugin SDK dependency and switch runtime imports to the documented SDK subpaths.
  - Use narrow imports such as `openclaw/plugin-sdk/plugin-entry`.
  - Confirm the package builds cleanly with those imports in compiled output.

- [ ] Define the actual tool registration shape for OpenClaw runtime.
  - Decide whether Lister is exposed as one multi-action tool or multiple narrower tools.
  - Map current operations (`listTypes`, `create`, `lists`, `add`, `items`, `remove`, `update`, `clear`, `stats`) into the OpenClaw tool contract.
  - Keep the existing function API intact unless there is a strong reason to split it.

## Packaging

- [ ] Add external-plugin compatibility metadata under `package.json > openclaw`.
  - Add `compat` metadata for supported plugin API / gateway versions.
  - Add `build` metadata for the OpenClaw / plugin SDK version used to build the package.

- [ ] Confirm the dependency tree is safe for OpenClaw install behavior.
  - OpenClaw installs npm plugins with `npm install --ignore-scripts`.
  - Avoid dependencies that require `postinstall`, native compilation, or generated artifacts at install time.

- [ ] Keep the published package layout aligned with native plugin expectations.
  - Root `openclaw.plugin.json`
  - `package.json` with `openclaw.extensions`
  - Built runtime in `dist/`
  - Plugin-bundled skills under `openclaw/skills/`

## Validation

- [ ] Test installation from a local package artifact with OpenClaw.
  - Build/package with `npm pack`
  - Install with `openclaw plugins install ./lister-<version>.tgz`
  - Confirm detection succeeds

- [ ] Verify plugin discovery and runtime registration in OpenClaw.
  - Check `openclaw plugins list`
  - Check `openclaw plugins inspect lister`
  - Restart the gateway if required
  - Confirm the tool is actually available to an agent session

- [ ] Validate failure modes and diagnostics.
  - Broken config should fail cleanly
  - Missing manifest / bad entrypoint should produce understandable errors
  - Tool registration errors should be visible through OpenClaw diagnostics

## Optional Follow-Up

- [ ] Add `openclaw.install` hints in `package.json` if we want better install/update ergonomics.

- [ ] Decide whether this should be published only to npm or also prepared for ClawHub package publishing.

- [ ] If ClawHub publication is a goal, add the required publish-baseline metadata and run a dry-run publish validation.
