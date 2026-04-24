import { Type } from "@sinclair/typebox";
import { BaseCommand } from "./base/BaseCommand.js";
import { commandArg } from "./helpers/commandSchemaHelpers.js";
import type { IItemsCommand, ItemsInput } from "./interfaces/IItemsCommand.js";
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

const ITEMS_COMMAND_SETUP = {
  name: "items",
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

export class ItemsCommand extends BaseCommand<ItemsInput> implements IItemsCommand {
  constructor(services: IServices) {
    super(services, ITEMS_COMMAND_SETUP);
  }

  async execute(parsed: ItemsInput): Promise<ToolResult> {
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
