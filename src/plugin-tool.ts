import { join, resolve } from "node:path";
import type { OpenClawPluginToolContext } from "openclaw/plugin-sdk/plugin-entry";
import { Type } from "@sinclair/typebox";
import { add, clear, create, items, listTypes, lists, remove, status, update, type ToolContext, type ToolResult } from "./tool.js";

const listerActions = [
  "listTypes",
  "create",
  "lists",
  "add",
  "items",
  "remove",
  "update",
  "clear",
  "status"
] as const;

const listerListTypes = [
  "general",
  "todos",
  "people",
  "habits",
  "shopping-items",
  "health-log",
  "waiting-on"
] as const;

type ListerAction = (typeof listerActions)[number];

interface ListerToolParams {
  action: ListerAction;
  list?: string;
  id?: number;
  limit?: number;
  listType?: (typeof listerListTypes)[number];
  description?: string;
  confirm?: boolean;
  data?: Record<string, unknown>;
}

function stringEnum<T extends readonly string[]>(values: T, description: string) {
  return Type.Unsafe<T[number]>({
    type: "string",
    enum: [...values],
    description
  });
}

function formatResult(result: ToolResult, action: ListerAction): string {
  if (action === "status" && typeof result.store_path === "string" && typeof result.store_exists === "boolean") {
    const existsText = result.store_exists ? "exists" : "does not exist yet";
    return `Lister store: ${result.store_path} (${existsText})\n${JSON.stringify(result, null, 2)}`;
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

function validateActionParams(params: ListerToolParams): ToolResult | undefined {
  switch (params.action) {
    case "listTypes":
    case "lists":
    case "status":
      return undefined;
    case "create":
    case "items":
      if (typeof params.list !== "string" || params.list.trim() === "") {
        return { ok: false, error: "list is required" };
      }
      return undefined;
    case "add":
      if (typeof params.list !== "string" || params.list.trim() === "") {
        return { ok: false, error: "list is required" };
      }
      if (!params.data || typeof params.data !== "object" || Array.isArray(params.data)) {
        return { ok: false, error: "data must be a JSON object" };
      }
      return undefined;
    case "remove":
      if (typeof params.list !== "string" || params.list.trim() === "") {
        return { ok: false, error: "list is required" };
      }
      if (typeof params.id !== "number" || !Number.isInteger(params.id) || params.id < 1) {
        return { ok: false, error: "id must be a positive integer" };
      }
      return undefined;
    case "update":
      if (typeof params.list !== "string" || params.list.trim() === "") {
        return { ok: false, error: "list is required" };
      }
      if (typeof params.id !== "number" || !Number.isInteger(params.id) || params.id < 1) {
        return { ok: false, error: "id must be a positive integer" };
      }
      if (!params.data || typeof params.data !== "object" || Array.isArray(params.data)) {
        return { ok: false, error: "data must be a JSON object" };
      }
      return undefined;
    case "clear":
      if (typeof params.list !== "string" || params.list.trim() === "") {
        return { ok: false, error: "list is required" };
      }
      if (params.confirm !== true) {
        return { ok: false, error: "confirm must be true" };
      }
      return undefined;
  }
}

async function runAction(params: ListerToolParams, context?: ToolContext): Promise<ToolResult> {
  switch (params.action) {
    case "listTypes":
      return listTypes();
    case "create":
      return create(
        {
          list: params.list ?? "",
          ...(params.listType ? { listType: params.listType } : {}),
          ...(params.description !== undefined ? { description: params.description } : {})
        },
        context
      );
    case "lists":
      return lists(context);
    case "add":
      return add(
        {
          list: params.list ?? "",
          ...(params.id !== undefined ? { id: params.id } : {}),
          data: params.data ?? {}
        },
        context
      );
    case "items":
      return items(
        {
          list: params.list ?? "",
          ...(params.limit !== undefined ? { limit: params.limit } : {})
        },
        context
      );
    case "remove":
      return remove(
        {
          list: params.list ?? "",
          id: params.id!
        },
        context
      );
    case "update":
      return update(
        {
          list: params.list ?? "",
          id: params.id!,
          data: params.data ?? {}
        },
        context
      );
    case "clear":
      return clear(
        {
          list: params.list ?? "",
          confirm: params.confirm === true
        },
        context
      );
    case "status":
      return status(context);
  }
}

export function createListerTool(ctx?: OpenClawPluginToolContext) {
  const toolContext = resolveRuntimeToolContext(ctx);

  return {
    name: "lister",
    label: "Lister",
    description: "Manage structured local lists. Choose an action, then provide the matching fields such as list, id, data, or confirm.",
    promptSnippet: "Use `lister` for structured local lists such as tasks, notes, habits, shopping items, contacts, health logs, and waiting-on queues.",
    promptGuidelines: [
      "Always provide the `action` field.",
      "For `add` and `update`, send the full item payload in `data` using the target list type's schema.",
      "For `clear`, require explicit confirmation with `confirm: true`."
    ],
    executionMode: "sequential" as const,
    parameters: Type.Object(
      {
        action: stringEnum(listerActions, "The Lister operation to run."),
        list: Type.Optional(Type.String({ description: "List name for actions that target a list." })),
        id: Type.Optional(Type.Integer({ minimum: 1, description: "1-based item id for add/remove/update actions." })),
        limit: Type.Optional(Type.Integer({ minimum: 1, description: "Maximum number of items to return from items." })),
        listType: Type.Optional(stringEnum(listerListTypes, "List type for create.")),
        description: Type.Optional(Type.String({ description: "Optional human-readable list description for create." })),
        confirm: Type.Optional(Type.Boolean({ description: "Required true for clear." })),
        data: Type.Optional(
          Type.Object(
            {},
            {
              additionalProperties: true,
              description: "Item payload for add/update. Shape depends on the target list type."
            }
          )
        )
      },
      {
        additionalProperties: false
      }
    ),
    async execute(_toolCallId: string, params: ListerToolParams) {
      const validationError = validateActionParams(params);
      if (validationError) {
        return {
          content: [{ type: "text" as const, text: formatResult(validationError, params.action) }],
          details: validationError
        };
      }

      try {
        const result = await runAction(params, toolContext);
        return {
          content: [{ type: "text" as const, text: formatResult(result, params.action) }],
          details: result
        };
      } catch (error) {
        const result = {
          ok: false,
          error: error instanceof Error ? error.message : "Lister tool failed"
        } satisfies ToolResult;
        return {
          content: [{ type: "text" as const, text: formatResult(result, params.action) }],
          details: result
        };
      }
    }
  };
}
