import { Type } from "@sinclair/typebox";
import { BaseCommand } from "./base/BaseCommand.js";
import { commandArg } from "./helpers/commandSchemaHelpers.js";
import type { IItemGetAllCommand, ItemGetAllInput } from "./interfaces/IItemGetAllCommand.js";
import type { IServices } from "../services/interfaces/IServices.js";
import type { IListerStoreService } from "../services/interfaces/IListerStoreService.js";
import type { ToolResult } from "../toolTypes.js";
import { getListNameValidationError } from "../services/ListerStoreService.js";

function filterItems(items: Awaited<ReturnType<IListerStoreService["items"]>>, limit?: number) {
  if (!limit || Number.isNaN(limit) || limit < 1) {
    return items;
  }
  return items.slice(0, limit);
}

const ITEM_GET_ALL_COMMAND_SETUP = {
  name: "itemGetAll",
  description: "Return items from a list, optionally limited.",
  requiredArgs: [
    commandArg(
      "list",
      "string",
      "List name to read from.",
      (description) => Type.String({ minLength: 1, description })
    )
  ],
  optionalArgs: [
    commandArg(
      "limit",
      "number",
      "Maximum number of items to return.",
      (description) => Type.Integer({ minimum: 1, description })
    )
  ]
} as const;

export class ItemGetAllCommand extends BaseCommand<ItemGetAllInput> implements IItemGetAllCommand {
  constructor(services: IServices) {
    super(services, ITEM_GET_ALL_COMMAND_SETUP);
  }

  async execute(parsed: ItemGetAllInput): Promise<ToolResult> {
    this.services.getListTypeRegisterService().startupChecks();
    const listNameError = getListNameValidationError(parsed.list);
    if (listNameError) {
      return { ok: false, error: listNameError };
    }
    const items = await this.services.getListerStoreService().items(parsed.list);
    const selected = filterItems(items, parsed.limit);
    return {
      ok: true,
      list: parsed.list,
      count: selected.length,
      items: selected
    };
  }
}
