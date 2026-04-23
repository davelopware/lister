import { join, resolve } from "node:path";
import type { OpenClawPluginToolContext } from "openclaw/plugin-sdk/plugin-entry";
import type { ToolContext, ToolResult } from "./tool-types.js";
import { createCommandExecutionContext } from "./services/createCommandExecutionContext.js";
import { createDefaultCommandRegistry } from "./commands/createDefaultCommandRegistry.js";

function formatResult(result: ToolResult, action: string): string {
  if (
    action === "status" &&
    typeof result.extension_version === "string" &&
    typeof result.store_path === "string" &&
    typeof result.store_exists === "boolean"
  ) {
    const existsText = result.store_exists ? "exists" : "does not exist yet";
    return `Lister version: ${result.extension_version}\nLister store: ${result.store_path} (${existsText})\n${JSON.stringify(result, null, 2)}`;
  }
  return JSON.stringify(result, null, 2);
}

function resolveRuntimeToolContext(ctx?: OpenClawPluginToolContext): ToolContext | undefined {
  if (!ctx) {
    return undefined;
  }
  if (ctx.workspaceDir && ctx.workspaceDir.trim() !== "") {
    return { dbPath: resolve(join(ctx.workspaceDir, "lister-store")) };
  }
  if (ctx.agentDir && ctx.agentDir.trim() !== "") {
    return { dbPath: resolve(join(ctx.agentDir, "lister-store")) };
  }
  return undefined;
}

function asObjectRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

export function createListerTool(ctx?: OpenClawPluginToolContext) {
  const registry = createDefaultCommandRegistry();
  const toolContext = resolveRuntimeToolContext(ctx);

  return {
    name: "lister",
    label: "Lister",
    description: "Manage structured local lists. Choose an action, then provide the matching fields for that action.",
    promptSnippet: "Use `lister` for structured local lists such as tasks, notes, habits, shopping items, contacts, health logs, waiting-on queues, and custom typed lists.",
    promptGuidelines: [
      "Always provide the `action` field.",
      "Use `showCommands` to discover commands, `commandArgs` to inspect a command's arguments, and `showListTypes` to discover available list types.",
      "Use `listTypeSchema` when you need the field schema for a specific list type.",
      "For `add` and `update`, send the full item payload in `data` using the target list type's schema.",
      "For `clear`, require explicit confirmation with `confirm: true`."
    ],
    executionMode: "sequential" as const,
    parameters: registry.buildSchema(),
    async execute(_toolCallId: string, params: unknown) {
      const raw = asObjectRecord(params);
      if (!raw) {
        const result = { ok: false, error: "params must be a JSON object" } satisfies ToolResult;
        return {
          content: [{ type: "text" as const, text: formatResult(result, "showCommands") }],
          details: result
        };
      }

      const action = raw.action;
      if (typeof action !== "string") {
        const result = { ok: false, error: "action must be a valid Lister operation" } satisfies ToolResult;
        return {
          content: [{ type: "text" as const, text: formatResult(result, "showCommands") }],
          details: result
        };
      }

      const command = registry.findCommand(action);
      if (!command) {
        const result = { ok: false, error: "action must be a valid Lister operation" } satisfies ToolResult;
        return {
          content: [{ type: "text" as const, text: formatResult(result, "showCommands") }],
          details: result
        };
      }

      const { action: _ignored, ...commandInput } = raw;
      const parsed = command.parse(commandInput);
      if (!parsed.ok) {
        const result = command.buildParseError(parsed);
        return {
          content: [{ type: "text" as const, text: formatResult(result, command.name) }],
          details: result
        };
      }

      try {
        const result = await command.execute(parsed.parsed as never, createCommandExecutionContext(registry, toolContext));
        return {
          content: [{ type: "text" as const, text: formatResult(result, command.name) }],
          details: result
        };
      } catch (error) {
        const result = {
          ok: false,
          error: error instanceof Error ? error.message : "Lister tool failed"
        } satisfies ToolResult;
        return {
          content: [{ type: "text" as const, text: formatResult(result, command.name) }],
          details: result
        };
      }
    }
  };
}
