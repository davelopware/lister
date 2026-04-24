import { Type } from "@sinclair/typebox";
import { BaseCommand } from "./base/BaseCommand.js";
import { commandArg } from "./helpers/commandSchemaHelpers.js";
import type { IListClearCommand, ListClearInput } from "./interfaces/IListClearCommand.js";
import type { IServices } from "../services/interfaces/IServices.js";
import type { ToolResult } from "../toolTypes.js";
import { getListNameValidationError } from "../services/ListerStoreService.js";

const LIST_CLEAR_COMMAND_SETUP = {
  name: "listClear",
  description: "Remove all items from a list.",
  requiredArgs: [
    commandArg(
      "list",
      "string",
      "List name to clear.",
      (description) => Type.String({ minLength: 1, description })
    ),
    commandArg(
      "confirm",
      "boolean",
      "Must be true to confirm the destructive clear.",
      (description) => Type.Literal(true, { description }),
      "true"
    )
  ]
} as const;

export class ListClearCommand extends BaseCommand<ListClearInput> implements IListClearCommand {
  constructor(services: IServices) {
    super(services, LIST_CLEAR_COMMAND_SETUP);
  }

  async execute(parsed: ListClearInput): Promise<ToolResult> {
    this.services.getListTypeRegisterService().startupChecks();
    const listNameError = getListNameValidationError(parsed.list);
    if (listNameError) {
      return { ok: false, error: listNameError };
    }
    const removed = await this.services.getListerStoreService().clear(parsed.list);
    return {
      ok: true,
      list: parsed.list,
      removed
    };
  }
}
