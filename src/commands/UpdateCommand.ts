import { Type } from "@sinclair/typebox";
import { BaseCommand } from "./base/BaseCommand.js";
import { createActionSchema } from "./helpers/command-schema-helpers.js";
import {
  readRequiredObject,
  readRequiredPositiveInt,
  readRequiredString,
  requireObject
} from "./helpers/command-parse-helpers.js";
import type { ICommandExecutionContext } from "./interfaces/ICommandExecutionContext.js";
import type { ICommandParseResult } from "./interfaces/ICommandParseResult.js";
import type { IUpdateCommand } from "./interfaces/IUpdateCommand.js";
import type { ToolResult, UpdateInput } from "../tool-types.js";
import { getListNameValidationError } from "../store/ListerStore.js";

export class UpdateCommand extends BaseCommand<UpdateInput> implements IUpdateCommand {
  constructor() {
    super(
      "update",
      "Replace an existing item in a list by its 1-based position id.",
      [
        { name: "list", type: "string", description: "List name to update." },
        { name: "id", type: "number", description: "1-based item id to update." },
        { name: "data", type: "object", description: "Full item payload that matches the list type schema." }
      ]
    );
  }

  getSchema() {
    return createActionSchema(this.name, {
      list: Type.String({ minLength: 1, description: "List name for update." }),
      id: Type.Integer({ minimum: 1, description: "1-based item id for update." }),
      data: Type.Object(
        {},
        {
          additionalProperties: true,
          description: "Item payload for update. Shape depends on the target list type."
        }
      )
    });
  }

  parse(input: unknown): ICommandParseResult<UpdateInput> {
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
    const data = readRequiredObject(params.parsed!, "data");
    if (!data.ok) {
      return { ok: false, error: data.error };
    }
    return {
      ok: true,
      parsed: {
        list: list.parsed!,
        id: id.parsed!,
        data: data.parsed!
      }
    };
  }

  async execute(parsed: UpdateInput, context: ICommandExecutionContext): Promise<ToolResult> {
    context.listTypeRegisterService.startupChecks();
    const listNameError = getListNameValidationError(parsed.list);
    if (listNameError) {
      return { ok: false, error: listNameError };
    }

    const info = await context.store.getListInfo(parsed.list);
    try {
      const item = await context.store.update(
        parsed.list,
        parsed.id,
        context.listTypeRegisterService.parseItemForListType(info.listType, parsed.data)
      );
      if (!item) {
        return { ok: false, error: "item not found" };
      }
      return {
        ok: true,
        list: parsed.list,
        list_type: info.listType,
        item
      };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Invalid list item" };
    }
  }
}
