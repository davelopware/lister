import { Type } from "@sinclair/typebox";
import { BaseCommand } from "./base/BaseCommand.js";
import { commandArg } from "./helpers/commandSchemaHelpers.js";
import { readRequiredString, readRequiredTrue, requireObject } from "./helpers/commandParseHelpers.js";
import type { IClearCommand } from "./interfaces/IClearCommand.js";
import type { ICommandParseResult } from "./interfaces/ICommandParseResult.js";
import type { IServices } from "../services/interfaces/IServices.js";
import type { ClearInput, ToolResult } from "../toolTypes.js";
import { getListNameValidationError } from "../services/ListerStoreService.js";

const CLEAR_COMMAND_SETUP = {
  name: "clear",
  description: "Remove all items from a list.",
  requiredArgs: [
    commandArg("list", "string", "List name to clear.", (description) => Type.String({ minLength: 1, description })),
    commandArg("confirm", "boolean", "Must be true to confirm the destructive clear.", (description) =>
      Type.Boolean({ description })
    )
  ]
} as const;

export class ClearCommand extends BaseCommand<ClearInput> implements IClearCommand {
  constructor(services: IServices) {
    super(services, CLEAR_COMMAND_SETUP);
  }

  parse(input: unknown): ICommandParseResult<ClearInput> {
    const params = requireObject(input);
    if (!params.ok) {
      return { ok: false, error: params.error };
    }
    const list = readRequiredString(params.parsed!, "list");
    if (!list.ok) {
      return { ok: false, error: list.error };
    }
    const confirm = readRequiredTrue(params.parsed!, "confirm");
    if (!confirm.ok) {
      return { ok: false, error: confirm.error };
    }
    return {
      ok: true,
      parsed: {
        list: list.parsed!,
        confirm: true
      }
    };
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
