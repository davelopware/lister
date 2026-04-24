import { Type } from "@sinclair/typebox";
import { BaseCommand } from "./base/BaseCommand.js";
import { commandArg } from "./helpers/commandSchemaHelpers.js";
import type { IUpdateCommand, UpdateInput } from "./interfaces/IUpdateCommand.js";
import type { IServices } from "../services/interfaces/IServices.js";
import type { ToolResult } from "../toolTypes.js";
import { getListNameValidationError } from "../services/ListerStoreService.js";

const UPDATE_COMMAND_SETUP = {
  name: "update",
  description: "Replace an existing item in a list by its 1-based position id.",
  requiredArgs: [
    commandArg(
      "list",
      "string",
      "List name to update.",
      (description) => Type.String({ minLength: 1, description })
    ),
    commandArg(
      "id",
      "number",
      "1-based item id to update.",
      (description) => Type.Integer({ minimum: 1, description })
    ),
    commandArg(
      "data",
      "object",
      "Full item payload that matches the list type schema.",
      (description) => Type.Object({}, { additionalProperties: true, description })
    )
  ]
} as const;

export class UpdateCommand extends BaseCommand<UpdateInput> implements IUpdateCommand {
  constructor(services: IServices) {
    super(services, UPDATE_COMMAND_SETUP);
  }

  async execute(parsed: UpdateInput): Promise<ToolResult> {
    const listTypeRegisterService = this.services.getListTypeRegisterService();
    const store = this.services.getListerStoreService();
    listTypeRegisterService.startupChecks();
    const listNameError = getListNameValidationError(parsed.list);
    if (listNameError) {
      return { ok: false, error: listNameError };
    }

    const info = await store.getListInfo(parsed.list);
    try {
      const item = await store.update(
        parsed.list,
        parsed.id,
        listTypeRegisterService.parseItemForListType(info.listType, parsed.data)
      );
      if (!item) {
        return { ok: false, error: "item not found" };
      }
      return {
        ok: true,
        list: parsed.list,
        list_type: info.listType,
        item
      };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Invalid list item" };
    }
  }
}
