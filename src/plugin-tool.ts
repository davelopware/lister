import { join, resolve } from "node:path";
import type { OpenClawPluginToolContext } from "openclaw/plugin-sdk/plugin-entry";
import { Type } from "@sinclair/typebox";
import {
  add,
  clear,
  type ClearInput,
  commandArgs,
  type CommandArgsInput,
  create,
  type CreateInput,
  items,
  type ItemsInput,
  listTypeSchema,
  type ListTypeSchemaInput,
  lists,
  remove,
  type ItemRefInput,
  showCommands,
  showListTypes,
  status,
  update,
  type AddInput,
  type ToolContext,
  type ToolResult,
  type UpdateInput
} from "./tool.js";

const listerActions = [
  "showCommands",
  "commandArgs",
  "showListTypes",
  "listTypeSchema",
  "create",
  "lists",
  "add",
  "items",
  "remove",
  "update",
  "clear",
  "status"
] as const;

type ListerAction = (typeof listerActions)[number];

type ShowCommandsParams = {
  action: "showCommands";
};

type CommandArgsParams = {
  action: "commandArgs";
} & CommandArgsInput;

type ShowListTypesParams = {
  action: "showListTypes";
};

type ListTypeSchemaParams = {
  action: "listTypeSchema";
} & ListTypeSchemaInput;

type CreateParams = {
  action: "create";
} & CreateInput;

type ListsParams = {
  action: "lists";
};

type AddParams = {
  action: "add";
} & AddInput;

type ItemsParams = {
  action: "items";
} & ItemsInput;

type RemoveParams = {
  action: "remove";
} & ItemRefInput;

type UpdateParams = {
  action: "update";
} & UpdateInput;

type ClearParams = {
  action: "clear";
} & ClearInput;

type StatusParams = {
  action: "status";
};

type ListerToolParams =
  | ShowCommandsParams
  | CommandArgsParams
  | ShowListTypesParams
  | ListTypeSchemaParams
  | CreateParams
  | ListsParams
  | AddParams
  | ItemsParams
  | RemoveParams
  | UpdateParams
  | ClearParams
  | StatusParams;

function asObjectRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function actionLiteral<T extends ListerAction>(action: T) {
  return Type.Literal(action);
}

function formatResult(result: ToolResult, action: ListerAction): string {
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

function validateActionParams(params: unknown): ToolResult | undefined {
  const raw = asObjectRecord(params);
  if (!raw) {
    return { ok: false, error: "params must be a JSON object" };
  }

  const action = raw.action;
  if (typeof action !== "string" || !listerActions.includes(action as ListerAction)) {
    return { ok: false, error: "action must be a valid Lister operation" };
  }

  switch (action) {
    case "showCommands":
    case "lists":
    case "showListTypes":
    case "status":
      return undefined;
    case "commandArgs":
      if (typeof raw.commandName !== "string" || raw.commandName.trim() === "") {
        return { ok: false, error: "commandName is required" };
      }
      return undefined;
    case "listTypeSchema":
      if (typeof raw.listTypeName !== "string" || raw.listTypeName.trim() === "") {
        return { ok: false, error: "listTypeName is required" };
      }
      return undefined;
    case "create":
    case "items":
      if (typeof raw.list !== "string" || raw.list.trim() === "") {
        return { ok: false, error: "list is required" };
      }
      return undefined;
    case "add":
      if (typeof raw.list !== "string" || raw.list.trim() === "") {
        return { ok: false, error: "list is required" };
      }
      if (!raw.data || typeof raw.data !== "object" || Array.isArray(raw.data)) {
        return { ok: false, error: "data must be a JSON object" };
      }
      return undefined;
    case "remove":
      if (typeof raw.list !== "string" || raw.list.trim() === "") {
        return { ok: false, error: "list is required" };
      }
      if (typeof raw.id !== "number" || !Number.isInteger(raw.id) || raw.id < 1) {
        return { ok: false, error: "id must be a positive integer" };
      }
      return undefined;
    case "update":
      if (typeof raw.list !== "string" || raw.list.trim() === "") {
        return { ok: false, error: "list is required" };
      }
      if (typeof raw.id !== "number" || !Number.isInteger(raw.id) || raw.id < 1) {
        return { ok: false, error: "id must be a positive integer" };
      }
      if (!raw.data || typeof raw.data !== "object" || Array.isArray(raw.data)) {
        return { ok: false, error: "data must be a JSON object" };
      }
      return undefined;
    case "clear":
      if (typeof raw.list !== "string" || raw.list.trim() === "") {
        return { ok: false, error: "list is required" };
      }
      if (raw.confirm !== true) {
        return { ok: false, error: "confirm must be true" };
      }
      return undefined;
  }
}

async function runAction(params: ListerToolParams, context?: ToolContext): Promise<ToolResult> {
  switch (params.action) {
    case "showCommands":
      return showCommands();
    case "commandArgs":
      return commandArgs({ commandName: params.commandName });
    case "showListTypes":
      return showListTypes(context);
    case "listTypeSchema":
      return listTypeSchema({ listTypeName: params.listTypeName }, context);
    case "create":
      return create(params, context);
    case "lists":
      return lists(context);
    case "add":
      return add(params, context);
    case "items":
      return items(params, context);
    case "remove":
      return remove(params, context);
    case "update":
      return update(params, context);
    case "clear":
      return clear(params, context);
    case "status":
      return status(context);
  }
}

function createActionSchema() {
  return Type.Union([
    Type.Object(
      {
        action: actionLiteral("showCommands")
      },
      { additionalProperties: false }
    ),
    Type.Object(
      {
        action: actionLiteral("commandArgs"),
        commandName: Type.String({ minLength: 1, description: "Command name for the `commandArgs` action." })
      },
      { additionalProperties: false }
    ),
    Type.Object(
      {
        action: actionLiteral("showListTypes")
      },
      { additionalProperties: false }
    ),
    Type.Object(
      {
        action: actionLiteral("listTypeSchema"),
        listTypeName: Type.String({ minLength: 1, description: "List type name for the `listTypeSchema` action." })
      },
      { additionalProperties: false }
    ),
    Type.Object(
      {
        action: actionLiteral("create"),
        list: Type.String({ minLength: 1, description: "List name for create." }),
        listType: Type.Optional(
          Type.String({ minLength: 1, description: "List type name for create. Use showListTypes to discover built-in and custom values." })
        ),
        description: Type.Optional(Type.String({ description: "Optional human-readable list description for create." }))
      },
      { additionalProperties: false }
    ),
    Type.Object(
      {
        action: actionLiteral("lists")
      },
      { additionalProperties: false }
    ),
    Type.Object(
      {
        action: actionLiteral("add"),
        list: Type.String({ minLength: 1, description: "List name for add." }),
        id: Type.Optional(Type.Integer({ minimum: 1, description: "1-based item id for add insertions." })),
        data: Type.Object(
          {},
          {
            additionalProperties: true,
            description: "Item payload for add. Shape depends on the target list type."
          }
        )
      },
      { additionalProperties: false }
    ),
    Type.Object(
      {
        action: actionLiteral("items"),
        list: Type.String({ minLength: 1, description: "List name for items." }),
        limit: Type.Optional(Type.Integer({ minimum: 1, description: "Maximum number of items to return from items." }))
      },
      { additionalProperties: false }
    ),
    Type.Object(
      {
        action: actionLiteral("remove"),
        list: Type.String({ minLength: 1, description: "List name for remove." }),
        id: Type.Integer({ minimum: 1, description: "1-based item id for remove." })
      },
      { additionalProperties: false }
    ),
    Type.Object(
      {
        action: actionLiteral("update"),
        list: Type.String({ minLength: 1, description: "List name for update." }),
        id: Type.Integer({ minimum: 1, description: "1-based item id for update." }),
        data: Type.Object(
          {},
          {
            additionalProperties: true,
            description: "Item payload for update. Shape depends on the target list type."
          }
        )
      },
      { additionalProperties: false }
    ),
    Type.Object(
      {
        action: actionLiteral("clear"),
        list: Type.String({ minLength: 1, description: "List name for clear." }),
        confirm: Type.Boolean({ description: "Required true for clear." })
      },
      { additionalProperties: false }
    ),
    Type.Object(
      {
        action: actionLiteral("status")
      },
      { additionalProperties: false }
    )
  ]);
}

export function createListerTool(ctx?: OpenClawPluginToolContext) {
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
    parameters: createActionSchema(),
    async execute(_toolCallId: string, params: unknown) {
      const validationError = validateActionParams(params);
      if (validationError) {
        return {
          content: [{ type: "text" as const, text: formatResult(validationError, "showCommands") }],
          details: validationError
        };
      }

      try {
        const result = await runAction(params as ListerToolParams, toolContext);
        return {
          content: [{ type: "text" as const, text: formatResult(result, (params as ListerToolParams).action) }],
          details: result
        };
      } catch (error) {
        const result = {
          ok: false,
          error: error instanceof Error ? error.message : "Lister tool failed"
        } satisfies ToolResult;
        return {
          content: [{ type: "text" as const, text: formatResult(result, (params as ListerToolParams).action) }],
          details: result
        };
      }
    }
  };
}
