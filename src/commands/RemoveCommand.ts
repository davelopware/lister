import { Type } from "@sinclair/typebox";
import { BaseCommand } from "./base/BaseCommand.js";
import { commandArg } from "./helpers/commandSchemaHelpers.js";
import { readRequiredPositiveInt, readRequiredString, requireObject } from "./helpers/commandParseHelpers.js";
import type { ICommandParseResult } from "./interfaces/ICommandParseResult.js";
import type { IRemoveCommand } from "./interfaces/IRemoveCommand.js";
import type { IServices } from "../services/interfaces/IServices.js";
import type { ItemRefInput, ToolResult } from "../toolTypes.js";
import { getListNameValidationError } from "../services/ListerStoreService.js";

const REMOVE_COMMAND_SETUP = {
  name: "remove",
  description: "Remove an item from a list by its 1-based position id.",
  requiredArgs: [
    commandArg("list", "string", "List name to remove the item from.", (description) =>
      Type.String({ minLength: 1, description })
    ),
    commandArg("id", "number", "1-based item id to remove.", (description) =>
      Type.Integer({ minimum: 1, description })
    )
  ]
} as const;

export class RemoveCommand extends BaseCommand<ItemRefInput> implements IRemoveCommand {
  constructor(services: IServices) {
    super(services, REMOVE_COMMAND_SETUP);
  }

  parse(input: unknown): ICommandParseResult<ItemRefInput> {
    const params = requireObject(input);
    if (!params.ok) {
      return { ok: false, error: params.error };
    }
    const list = readRequiredString(params.parsed!, "list");
    if (!list.ok) {
      return { ok: false, error: list.error };
    }
    const id = readRequiredPositiveInt(params.parsed!, "id");
    if (!id.ok) {
      return { ok: false, error: id.error };
    }
    return {
      ok: true,
      parsed: {
        list: list.parsed!,
        id: id.parsed!
      }
    };
  }

  async execute(parsed: ItemRefInput): Promise<ToolResult> {
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
