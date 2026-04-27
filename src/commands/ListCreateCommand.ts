import { Type } from "@sinclair/typebox";
import { BaseCommand } from "./base/BaseCommand.js";
import { commandArg } from "./helpers/commandSchemaHelpers.js";
import type { IListCreateCommand, ListCreateInput } from "./interfaces/IListCreateCommand.js";
import type { IServices } from "../services/interfaces/IServices.js";
import type { ToolResult } from "../toolTypes.js";
import { getListNameValidationError } from "../services/ListerStoreService.js";
import { DEFAULT_LIST_TYPE_NAME } from "../services/interfaces/IListTypeRegisterService.js";

const MIN_LIST_DESCRIPTION_LENGTH = 10;

const LIST_CREATE_COMMAND_SETUP = {
  name: "listCreate",
  description: "Create a list with a required description and an optional type.",
  requiredArgs: [
    commandArg("list", "string", "List name to create.", (description) => Type.String({ minLength: 1, description })),
    commandArg(
      "description",
      "string",
      `Human-readable description for the list. Minimum ${MIN_LIST_DESCRIPTION_LENGTH} characters.`,
      (description) => Type.String({ minLength: MIN_LIST_DESCRIPTION_LENGTH, description })
    )
  ],
  optionalArgs: [
    commandArg(
      "listType",
      "string",
      "List type name for the new list. Use typeGetAll to discover built-in and custom values.",
      (description) => Type.String({ minLength: 1, description })
    ),
    commandArg(
      "firstItem",
      "object",
      "Optional first item payload for the new list. It must match the selected list type schema.",
      (description) => Type.Object({}, { additionalProperties: true, description })
    )
  ]
} as const;

export class ListCreateCommand extends BaseCommand<ListCreateInput> implements IListCreateCommand {
  constructor(services: IServices) {
    super(services, LIST_CREATE_COMMAND_SETUP);
  }

  async execute(parsed: ListCreateInput): Promise<ToolResult> {
    const listTypeRegisterService = this.services.getListTypeRegisterService();
    const store = this.services.getListerStoreService();
    listTypeRegisterService.startupChecks();
    const listNameError = getListNameValidationError(parsed.list);
    if (listNameError) {
      return { ok: false, error: listNameError };
    }
    if (parsed.listType && !listTypeRegisterService.isListType(parsed.listType)) {
      return {
        ok: false,
        error: `Unknown listType: ${parsed.listType}. Available types: ${listTypeRegisterService.listTypeNames().join(", ")}`
      };
    }
    if (parsed.description.trim().length < MIN_LIST_DESCRIPTION_LENGTH) {
      return {
        ok: false,
        error: `description must be at least ${MIN_LIST_DESCRIPTION_LENGTH} characters`
      };
    }

    try {
      const listType = parsed.listType ?? DEFAULT_LIST_TYPE_NAME;
      const firstItem =
        parsed.firstItem === undefined
          ? undefined
          : listTypeRegisterService.parseItemForListType(listType, parsed.firstItem);

      const result = await store.createList(parsed.list, {
        ...(parsed.listType ? { listType: parsed.listType } : {}),
        description: parsed.description,
        ...(firstItem !== undefined ? { firstItem } : {})
      });

      return {
        ok: true,
        created: result.created,
        list: parsed.list,
        list_type: result.listType,
        description: result.description,
        ...(result.item ? { item: result.item } : {})
      };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Invalid list item" };
    }
  }
}
