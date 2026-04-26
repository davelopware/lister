import { Type } from "@sinclair/typebox";
import { BaseCommand } from "./base/BaseCommand.js";
import { commandArg } from "./helpers/commandSchemaHelpers.js";
import type { IItemUpdateCommand, ItemUpdateInput } from "./interfaces/IItemUpdateCommand.js";
import type { IServices } from "../services/interfaces/IServices.js";
import type { ToolResult } from "../toolTypes.js";
import { getListNameValidationError } from "../services/ListerStoreService.js";

const ITEM_UPDATE_COMMAND_SETUP = {
  name: "itemUpdate",
  description: "Update one or more fields on an existing item in a list by its 1-based position id.",
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
      "Partial item payload. Only supplied fields are updated, and each supplied field must match the list type schema.",
      (description) => Type.Object({}, { additionalProperties: true, description })
    )
  ]
} as const;

export class ItemUpdateCommand extends BaseCommand<ItemUpdateInput> implements IItemUpdateCommand {
  constructor(services: IServices) {
    super(services, ITEM_UPDATE_COMMAND_SETUP);
  }

  async execute(parsed: ItemUpdateInput): Promise<ToolResult> {
    const listTypeRegisterService = this.services.getListTypeRegisterService();
    const store = this.services.getListerStoreService();
    listTypeRegisterService.startupChecks();
    const listNameError = getListNameValidationError(parsed.list);
    if (listNameError) {
      return { ok: false, error: listNameError };
    }

    const info = await store.getListInfo(parsed.list);
    try {
      const existingItems = await store.items(parsed.list);
      const existingItem = existingItems.find((entry) => entry.id === parsed.id);
      if (!existingItem) {
        return { ok: false, error: "item not found" };
      }

      const partialData = listTypeRegisterService.parsePartialItemForListType(info.listType, parsed.data);
      const item = await store.update(
        parsed.list,
        parsed.id,
        { ...existingItem.data, ...partialData }
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
