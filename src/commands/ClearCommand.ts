import { Type } from "@sinclair/typebox";
import { BaseCommand } from "./base/BaseCommand.js";
import { createActionSchema } from "./helpers/command-schema-helpers.js";
import { readRequiredString, readRequiredTrue, requireObject } from "./helpers/command-parse-helpers.js";
import type { IClearCommand } from "./interfaces/IClearCommand.js";
import type { ICommandExecutionContext } from "./interfaces/ICommandExecutionContext.js";
import type { ICommandParseResult } from "./interfaces/ICommandParseResult.js";
import type { ClearInput, ToolResult } from "../tool-types.js";
import { getListNameValidationError } from "../store/ListerStore.js";

export class ClearCommand extends BaseCommand<ClearInput> implements IClearCommand {
  constructor() {
    super(
      "clear",
      "Remove all items from a list.",
      [
        { name: "list", type: "string", description: "List name to clear." },
        { name: "confirm", type: "boolean", description: "Must be true to confirm the destructive clear." }
      ]
    );
  }

  getSchema() {
    return createActionSchema(this.name, {
      list: Type.String({ minLength: 1, description: "List name for clear." }),
      confirm: Type.Boolean({ description: "Required true for clear." })
    });
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

  async execute(parsed: ClearInput, context: ICommandExecutionContext): Promise<ToolResult> {
    context.listTypeRegisterService.startupChecks();
    const listNameError = getListNameValidationError(parsed.list);
    if (listNameError) {
      return { ok: false, error: listNameError };
    }
    const removed = await context.store.clear(parsed.list);
    return {
      ok: true,
      list: parsed.list,
      removed
    };
  }
}
