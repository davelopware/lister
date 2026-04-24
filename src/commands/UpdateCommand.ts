import { Type } from "@sinclair/typebox";
import { BaseCommand } from "./base/BaseCommand.js";
import { commandArg } from "./helpers/commandSchemaHelpers.js";
import {
  readRequiredObject,
  readRequiredPositiveInt,
  readRequiredString,
  requireObject
} from "./helpers/commandParseHelpers.js";
import type { ICommandParseResult } from "./interfaces/ICommandParseResult.js";
import type { IUpdateCommand } from "./interfaces/IUpdateCommand.js";
import type { IServices } from "../services/interfaces/IServices.js";
import type { ToolResult, UpdateInput } from "../toolTypes.js";
import { getListNameValidationError } from "../services/ListerStoreService.js";

const UPDATE_COMMAND_SETUP = {
  name: "update",
  description: "Replace an existing item in a list by its 1-based position id.",
  requiredArgs: [
    commandArg("list", "string", "List name to update.", (description) => Type.String({ minLength: 1, description })),
    commandArg("id", "number", "1-based item id to update.", (description) => Type.Integer({ minimum: 1, description })),
    commandArg("data", "object", "Full item payload that matches the list type schema.", (description) =>
      Type.Object({}, { additionalProperties: true, description })
    )
  ]
} as const;

export class UpdateCommand extends BaseCommand<UpdateInput> implements IUpdateCommand {
  constructor(services: IServices) {
    super(services, UPDATE_COMMAND_SETUP);
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

  async execute(parsed: UpdateInput): Promise<ToolResult> {
    const listTypeRegisterService = this.services.getListTypeRegisterService();
    const store = this.services.getListerStoreService();
    listTypeRegisterService.startupChecks();
    const listNameError = getListNameValidationError(parsed.list);
    if (listNameError) {
      return { ok: false, error: listNameError };
    }

    const info = await store.getListInfo(parsed.list);
    try {
      const item = await store.update(
        parsed.list,
        parsed.id,
        listTypeRegisterService.parseItemForListType(info.listType, parsed.data)
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
