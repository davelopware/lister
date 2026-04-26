import { Type } from "@sinclair/typebox";
import { BaseCommand } from "./base/BaseCommand.js";
import { commandArg } from "./helpers/commandSchemaHelpers.js";
import type { IListRemoveCommand, ListRemoveInput } from "./interfaces/IListRemoveCommand.js";
import type { IServices } from "../services/interfaces/IServices.js";
import type { ToolResult } from "../toolTypes.js";
import { getListNameValidationError } from "../services/ListerStoreService.js";

const LIST_REMOVE_COMMAND_SETUP = {
  name: "listRemove",
  description: "Remove a list and all of its items.",
  requiredArgs: [
    commandArg(
      "list",
      "string",
      "List name to remove.",
      (description) => Type.String({ minLength: 1, description })
    ),
    commandArg(
      "confirm",
      "boolean",
      "Must be true to confirm the destructive list removal.",
      (description) => Type.Literal(true, { description }),
      "true"
    )
  ]
} as const;

export class ListRemoveCommand extends BaseCommand<ListRemoveInput> implements IListRemoveCommand {
  constructor(services: IServices) {
    super(services, LIST_REMOVE_COMMAND_SETUP);
  }

  async execute(parsed: ListRemoveInput): Promise<ToolResult> {
    this.services.getListTypeRegisterService().startupChecks();
    const listNameError = getListNameValidationError(parsed.list);
    if (listNameError) {
      return { ok: false, error: listNameError };
    }
    const removed = await this.services.getListerStoreService().removeList(parsed.list);
    if (!removed) {
      return { ok: false, error: "list not found" };
    }
    return {
      ok: true,
      list: parsed.list,
      removed: parsed.list
    };
  }
}
