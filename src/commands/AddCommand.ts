import { Type } from "@sinclair/typebox";
import { BaseCommand } from "./base/BaseCommand.js";
import { createActionSchema } from "./helpers/command-schema-helpers.js";
import {
  readOptionalPositiveInt,
  readRequiredObject,
  readRequiredString,
  requireObject
} from "./helpers/command-parse-helpers.js";
import type { IAddCommand } from "./interfaces/IAddCommand.js";
import type { ICommandParseResult } from "./interfaces/ICommandParseResult.js";
import type { IServices } from "../services/interfaces/IServices.js";
import type { AddInput, ToolResult } from "../tool-types.js";
import { getListNameValidationError } from "../services/ListerStoreService.js";

export class AddCommand extends BaseCommand<AddInput> implements IAddCommand {
  constructor(services: IServices) {
    super(
      services,
      "add",
      "Add an item to a list, optionally inserting at a 1-based position.",
      [
        { name: "list", type: "string", description: "List name to add the item to." },
        { name: "data", type: "object", description: "Item payload that matches the list type schema." }
      ],
      [{ name: "id", type: "number", description: "1-based position to insert at. If omitted, append to the end." }]
    );
  }

  getSchema() {
    return createActionSchema(this.name, {
      list: Type.String({ minLength: 1, description: "List name for add." }),
      id: Type.Optional(Type.Integer({ minimum: 1, description: "1-based item id for add insertions." })),
      data: Type.Object(
        {},
        {
          additionalProperties: true,
          description: "Item payload for add. Shape depends on the target list type."
        }
      )
    });
  }

  parse(input: unknown): ICommandParseResult<AddInput> {
    const params = requireObject(input);
    if (!params.ok) {
      return { ok: false, error: params.error };
    }
    const list = readRequiredString(params.parsed!, "list");
    if (!list.ok) {
      return { ok: false, error: list.error };
    }
    const id = readOptionalPositiveInt(params.parsed!, "id");
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
        ...(id.parsed !== undefined ? { id: id.parsed } : {}),
        data: data.parsed!
      }
    };
  }

  async execute(parsed: AddInput): Promise<ToolResult> {
    const listTypeRegisterService = this.services.getListTypeRegisterService();
    const store = this.services.getListerStoreService();
    listTypeRegisterService.startupChecks();
    const listNameError = getListNameValidationError(parsed.list);
    if (listNameError) {
      return { ok: false, error: listNameError };
    }

    const info = await store.getListInfo(parsed.list);
    try {
      const item = await store.add(
        parsed.list,
        listTypeRegisterService.parseItemForListType(info.listType, parsed.data),
        parsed.id
      );
      return { ok: true, list_type: info.listType, item };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Invalid list item" };
    }
  }
}
