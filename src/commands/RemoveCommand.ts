import { Type } from "@sinclair/typebox";
import { BaseCommand } from "./base/BaseCommand.js";
import { createActionSchema } from "./helpers/command-schema-helpers.js";
import { readRequiredPositiveInt, readRequiredString, requireObject } from "./helpers/command-parse-helpers.js";
import type { ICommandExecutionContext } from "./interfaces/ICommandExecutionContext.js";
import type { ICommandParseResult } from "./interfaces/ICommandParseResult.js";
import type { IRemoveCommand } from "./interfaces/IRemoveCommand.js";
import type { ItemRefInput, ToolResult } from "../tool-types.js";
import { getListNameValidationError } from "../store/ListerStore.js";

export class RemoveCommand extends BaseCommand<ItemRefInput> implements IRemoveCommand {
  constructor() {
    super(
      "remove",
      "Remove an item from a list by its 1-based position id.",
      [
        { name: "list", type: "string", description: "List name to remove the item from." },
        { name: "id", type: "number", description: "1-based item id to remove." }
      ]
    );
  }

  getSchema() {
    return createActionSchema(this.name, {
      list: Type.String({ minLength: 1, description: "List name for remove." }),
      id: Type.Integer({ minimum: 1, description: "1-based item id for remove." })
    });
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

  async execute(parsed: ItemRefInput, context: ICommandExecutionContext): Promise<ToolResult> {
    context.listTypeRegisterService.startupChecks();
    const listNameError = getListNameValidationError(parsed.list);
    if (listNameError) {
      return { ok: false, error: listNameError };
    }
    const removed = await context.store.remove(parsed.list, parsed.id);
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
