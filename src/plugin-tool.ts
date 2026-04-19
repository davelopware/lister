import { Type } from "@sinclair/typebox";
import { add, clear, create, items, listTypes, lists, remove, stats, update, type ToolResult } from "./tool.js";

const listerActions = [
  "listTypes",
  "create",
  "lists",
  "add",
  "items",
  "remove",
  "update",
  "clear",
  "stats"
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

function stringEnum<T extends readonly string[]>(values: T, description: string) {
  return Type.Unsafe<T[number]>({
    type: "string",
    enum: [...values],
    description
  });
}

function formatResult(result: ToolResult): string {
  return JSON.stringify(result, null, 2);
}

export function createListerTool() {
  return {
    name: "lister",
    label: "Lister",
    description: "Manage structured local lists. Choose an action, then provide the matching fields such as list, id, data, or confirm.",
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
    async execute(_toolCallId: string, params: {
      action: ListerAction;
      list?: string;
      id?: number;
      limit?: number;
      listType?: (typeof listerListTypes)[number];
      description?: string;
      confirm?: boolean;
      data?: Record<string, unknown>;
    }) {
      let result: ToolResult;

      switch (params.action) {
        case "listTypes":
          result = await listTypes();
          break;
        case "create":
          result = await create(
            {
              list: params.list ?? "",
              ...(params.listType ? { listType: params.listType } : {}),
              ...(params.description !== undefined ? { description: params.description } : {})
            }
          );
          break;
        case "lists":
          result = await lists();
          break;
        case "add":
          result = await add(
            {
              list: params.list ?? "",
              ...(params.id !== undefined ? { id: params.id } : {}),
              data: params.data ?? {}
            }
          );
          break;
        case "items":
          result = await items(
            {
              list: params.list ?? "",
              ...(params.limit !== undefined ? { limit: params.limit } : {})
            }
          );
          break;
        case "remove":
          result = await remove({
            list: params.list ?? "",
            id: params.id ?? 0
          });
          break;
        case "update":
          result = await update({
            list: params.list ?? "",
            id: params.id ?? 0,
            data: params.data ?? {}
          });
          break;
        case "clear":
          result = await clear({
            list: params.list ?? "",
            confirm: params.confirm === true
          });
          break;
        case "stats":
          result = await stats();
          break;
      }

      return {
        content: [{ type: "text" as const, text: formatResult(result) }],
        details: result
      };
    }
  };
}
