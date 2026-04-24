import { Type } from "@sinclair/typebox";
import { BaseCommand } from "./base/BaseCommand.js";
import { commandArg } from "./helpers/commandSchemaHelpers.js";
import { readOptionalString, readRequiredString, requireObject } from "./helpers/commandParseHelpers.js";
import type { ICommandParseResult } from "./interfaces/ICommandParseResult.js";
import type { ICreateCommand } from "./interfaces/ICreateCommand.js";
import type { IServices } from "../services/interfaces/IServices.js";
import type { CreateInput, ToolResult } from "../toolTypes.js";
import { getListNameValidationError } from "../services/ListerStoreService.js";

const CREATE_COMMAND_SETUP = {
  name: "create",
  description: "Create a list with an optional type and description.",
  requiredArgs: [commandArg("list", "string", "List name to create.", (description) => Type.String({ minLength: 1, description }))],
  optionalArgs: [
    commandArg(
      "listType",
      "string",
      "List type name for the new list. Use showListTypes to discover built-in and custom values.",
      (description) => Type.String({ minLength: 1, description })
    ),
    commandArg("description", "string", "Human-readable description for the list.", (description) =>
      Type.String({ description })
    )
  ]
} as const;

export class CreateCommand extends BaseCommand<CreateInput> implements ICreateCommand {
  constructor(services: IServices) {
    super(services, CREATE_COMMAND_SETUP);
  }

  parse(input: unknown): ICommandParseResult<CreateInput> {
    const params = requireObject(input);
    if (!params.ok) {
      return { ok: false, error: params.error };
    }
    const list = readRequiredString(params.parsed!, "list");
    if (!list.ok) {
      return { ok: false, error: list.error };
    }
    const listType = readOptionalString(params.parsed!, "listType");
    if (!listType.ok) {
      return { ok: false, error: listType.error };
    }
    const description = readOptionalString(params.parsed!, "description");
    if (!description.ok) {
      return { ok: false, error: description.error };
    }
    return {
      ok: true,
      parsed: {
        list: list.parsed!,
        ...(listType.parsed !== undefined ? { listType: listType.parsed } : {}),
        ...(description.parsed !== undefined ? { description: description.parsed } : {})
      }
    };
  }

  async execute(parsed: CreateInput): Promise<ToolResult> {
    const listTypeRegisterService = this.services.getListTypeRegisterService();
    const store = this.services.getListerStoreService();
    listTypeRegisterService.startupChecks();
    const listNameError = getListNameValidationError(parsed.list);
    if (listNameError) {
      return { ok: false, error: listNameError };
    }
    if (parsed.listType && !listTypeRegisterService.isListType(parsed.listType)) {
      return {
        ok: false,
        error: `Unknown listType: ${parsed.listType}. Available types: ${listTypeRegisterService.listTypeNames().join(", ")}`
      };
    }

    const result = await store.createList(parsed.list, {
      ...(parsed.listType ? { listType: parsed.listType } : {}),
      ...(parsed.description !== undefined ? { description: parsed.description } : {})
    });

    return {
      ok: true,
      created: result.created,
      list: parsed.list,
      list_type: result.listType,
      description: result.description
    };
  }
}
