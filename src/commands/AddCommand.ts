import { Type } from "@sinclair/typebox";
import { BaseCommand } from "./base/BaseCommand.js";
import { commandArg } from "./helpers/commandSchemaHelpers.js";
import type { IAddCommand } from "./interfaces/IAddCommand.js";
import type { IServices } from "../services/interfaces/IServices.js";
import type { AddInput, ToolResult } from "../toolTypes.js";
import { getListNameValidationError } from "../services/ListerStoreService.js";

const ADD_COMMAND_SETUP = {
  name: "add",
  description: "Add an item to a list, optionally inserting at a 1-based position.",
  requiredArgs: [
    commandArg(
      "list",
      "string",
      "List name to add the item to.",
      (description) => Type.String({ minLength: 1, description })
    ),
    commandArg(
      "data",
      "object",
      "Item payload that matches the list type schema.",
      (description) => Type.Object({}, { additionalProperties: true, description })
    )
  ],
  optionalArgs: [
    commandArg(
      "id",
      "number",
      "1-based position to insert at. If omitted, append to the end.",
      (description) => Type.Integer({ minimum: 1, description })
    )
  ]
} as const;

export class AddCommand extends BaseCommand<AddInput> implements IAddCommand {
  constructor(services: IServices) {
    super(services, ADD_COMMAND_SETUP);
  }

  async execute(parsed: AddInput): Promise<ToolResult> {
    const listTypeRegisterService = this.services.getListTypeRegisterService();
    const store = this.services.getListerStoreService();
    listTypeRegisterService.startupChecks();
    const listNameError = getListNameValidationError(parsed.list);
    if (listNameError) {
      return { ok: false, error: listNameError };
    }

    const info = await store.getListInfo(parsed.list);
    try {
      const item = await store.add(
        parsed.list,
        listTypeRegisterService.parseItemForListType(info.listType, parsed.data),
        parsed.id
      );
      return { ok: true, list_type: info.listType, item };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Invalid list item" };
    }
  }
}
