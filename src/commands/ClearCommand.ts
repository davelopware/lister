import { Type } from "@sinclair/typebox";
import { BaseCommand } from "./base/BaseCommand.js";
import { commandArg } from "./helpers/commandSchemaHelpers.js";
import type { IClearCommand } from "./interfaces/IClearCommand.js";
import type { IServices } from "../services/interfaces/IServices.js";
import type { ClearInput, ToolResult } from "../toolTypes.js";
import { getListNameValidationError } from "../services/ListerStoreService.js";

const CLEAR_COMMAND_SETUP = {
  name: "clear",
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

export class ClearCommand extends BaseCommand<ClearInput> implements IClearCommand {
  constructor(services: IServices) {
    super(services, CLEAR_COMMAND_SETUP);
  }

  async execute(parsed: ClearInput): Promise<ToolResult> {
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
