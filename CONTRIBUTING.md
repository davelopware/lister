# Contributing

This repository is small, but it has a deliberate structure. New contributors should start with the docs below before changing runtime code:

- [`README.md`](./README.md): product surface, usage, and release commands
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md): execution flow and module responsibilities
- [`test/integration.test.mjs`](./test/integration.test.mjs): end-to-end behavior contract

## Local Setup

Requirements:

- Node.js 20+
- npm

Install and verify:

```bash
npm install
npm run build
npm test
```

Useful commands:

- `npm run build`: compile TypeScript and copy bundled assets into `dist/`
- `npm run check`: type-check only
- `npm test`: build plus integration tests
- `npm pack`: verify the publishable package shape
- `npm run release -- <x.y.z>`: controlled release flow

## Repository Map

- `src/index.ts`: package entry point and OpenClaw plugin registration export
- `src/tool.ts`: framework-neutral command surface and shared service bootstrap
- `src/pluginTool.ts`: OpenClaw adapter around the command registry
- `src/commands/`: one class per command plus shared parsing/schema helpers
- `src/services/`: persistence, list-type registry, command registry, and service container
- `src/utils/`: runtime path helpers
- `src/builtin-list-types.json`: built-in list type definitions shipped with the package
- `openclaw/`: plugin manifests and bundled skill metadata
- `scripts/`: build/release helper scripts
- `test/integration.test.mjs`: primary regression suite

## How The Code Is Organized

The main architectural rule is: keep responsibilities narrow.

- Commands own user-facing command metadata, argument parsing, and result shaping.
- Services own shared state and cross-command behavior.
- `ListerStoreService` owns file persistence and stored-list validation.
- `ListTypeRegisterService` owns list-type discovery and item payload validation.
- `pluginTool.ts` adapts the generic command surface into the OpenClaw runtime contract.

If you need the detailed request flow, read [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).

## First Files To Read

For most changes, read files in this order:

1. `src/index.ts`
2. `src/tool.ts`
3. `src/pluginTool.ts`
4. `src/commands/base/BaseCommand.ts`
5. The specific command file you want to change
6. The relevant service under `src/services/`
7. `test/integration.test.mjs`

That path mirrors how a request moves through the system.

## Common Change Patterns

### Add or change a command

1. Update or add the command class in `src/commands/`.
2. If the command needs a new input shape, update the matching interface file in `src/commands/interfaces/`.
3. Register the command in `configureServices()` in `src/tool.ts`.
4. Add or update integration coverage in `test/integration.test.mjs`.
5. If the command changes the public surface, update `README.md` and `openclaw/skills/lister/SKILL.md`.

### Change list storage behavior

Start in `src/services/ListerStoreService.ts`.

Keep in mind:

- list files are plain JSON, one file per list
- item IDs are positional and 1-based
- store-level validation is about persisted file shape, not command parsing

Any storage change should have integration coverage, because it affects both the library API and the plugin runtime.

### Add or change a list type

If you are changing built-ins, edit `src/builtin-list-types.json`.

If you are changing how types are validated or merged:

- update `src/services/ListTypeRegisterService.ts`
- keep custom-type behavior additive
- keep error messages actionable, because config mistakes happen at runtime

### Change OpenClaw integration

Stay within:

- `src/index.ts`
- `src/pluginTool.ts`
- `openclaw.plugin.json`
- `openclaw/tools/lister.tool.json`
- `openclaw/skills/lister/SKILL.md`

Preserve the separation between the generic tool surface and the OpenClaw adapter unless there is a strong reason to collapse it.

## Testing Expectations

Default expectation for behavior changes:

- add or update an integration test in `test/integration.test.mjs`
- run `npm test`

Use `npm pack` when a change touches:

- published files
- plugin manifests
- package metadata
- entry points or build output assumptions

## Contribution Guidelines

- Keep changes small and responsibility-focused.
- Prefer extending the existing command/service patterns instead of adding parallel abstractions.
- Keep command metadata in command classes; avoid duplicating names, descriptions, or argument contracts elsewhere.
- Preserve the distinction between parse-time validation and persistence-time validation.
- Do not weaken file-format or list-type diagnostics; contributor-friendly code includes clear failure messages.

## Documentation Maintenance

Update docs when you change any of the following:

- public commands or their arguments
- built-in list types
- store location or file layout
- plugin registration or packaging behavior
- recommended contributor workflow
