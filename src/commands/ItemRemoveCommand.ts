import { Type } from "@sinclair/typebox";
import { BaseCommand } from "./base/BaseCommand.js";
import { commandArg } from "./helpers/commandSchemaHelpers.js";
import type { IItemRemoveCommand, ItemRemoveInput } from "./interfaces/IItemRemoveCommand.js";
import type { IServices } from "../services/interfaces/IServices.js";
import type { ToolResult } from "../toolTypes.js";
import { getListNameValidationError } from "../services/ListerStoreService.js";

const ITEM_REMOVE_COMMAND_SETUP = {
  name: "itemRemove",
  description: "Remove an item from a list by its 1-based position id.",
  requiredArgs: [
    commandArg(
      "list",
      "string",
      "List name to remove the item from.",
      (description) => Type.String({ minLength: 1, description })
    ),
    commandArg(
      "id",
      "number",
      "1-based item id to remove.",
      (description) => Type.Integer({ minimum: 1, description })
    )
  ]
} as const;

export class ItemRemoveCommand extends BaseCommand<ItemRemoveInput> implements IItemRemoveCommand {
  constructor(services: IServices) {
    super(services, ITEM_REMOVE_COMMAND_SETUP);
  }

  async execute(parsed: ItemRemoveInput): Promise<ToolResult> {
    this.services.getListTypeRegisterService().startupChecks();
    const listNameError = getListNameValidationError(parsed.list);
    if (listNameError) {
      return { ok: false, error: listNameError };
    }
    const removed = await this.services.getListerStoreService().remove(parsed.list, parsed.id);
    if (!removed) {
      return { ok: false, error: "item not found" };
    }
    return {
      ok: true,
      list: parsed.list,
      removed: parsed.id
    };
  }
}
