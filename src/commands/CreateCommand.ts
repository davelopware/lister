import { Type } from "@sinclair/typebox";
import { BaseCommand } from "./base/BaseCommand.js";
import { createActionSchema } from "./helpers/command-schema-helpers.js";
import { readOptionalString, readRequiredString, requireObject } from "./helpers/command-parse-helpers.js";
import type { ICommandExecutionContext } from "./interfaces/ICommandExecutionContext.js";
import type { ICommandParseResult } from "./interfaces/ICommandParseResult.js";
import type { ICreateCommand } from "./interfaces/ICreateCommand.js";
import type { CreateInput, ToolResult } from "../tool-types.js";
import { getListNameValidationError } from "../store/ListerStore.js";

export class CreateCommand extends BaseCommand<CreateInput> implements ICreateCommand {
  constructor() {
    super(
      "create",
      "Create a list with an optional type and description.",
      [{ name: "list", type: "string", description: "List name to create." }],
      [
        { name: "listType", type: "string", description: "List type name for the new list." },
        { name: "description", type: "string", description: "Human-readable description for the list." }
      ]
    );
  }

  getSchema() {
    return createActionSchema(this.name, {
      list: Type.String({ minLength: 1, description: "List name for create." }),
      listType: Type.Optional(
        Type.String({ minLength: 1, description: "List type name for create. Use showListTypes to discover built-in and custom values." })
      ),
      description: Type.Optional(Type.String({ description: "Optional human-readable list description for create." }))
    });
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

  async execute(parsed: CreateInput, context: ICommandExecutionContext): Promise<ToolResult> {
    context.listTypeRegisterService.startupChecks();
    const listNameError = getListNameValidationError(parsed.list);
    if (listNameError) {
      return { ok: false, error: listNameError };
    }
    if (parsed.listType && !context.listTypeRegisterService.isListType(parsed.listType)) {
      return {
        ok: false,
        error: `Unknown listType: ${parsed.listType}. Available types: ${context.listTypeRegisterService.listTypeNames().join(", ")}`
      };
    }

    const result = await context.store.createList(parsed.list, {
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
