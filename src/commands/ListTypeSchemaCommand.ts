import { Type } from "@sinclair/typebox";
import { BaseCommand } from "./base/BaseCommand.js";
import { createActionSchema } from "./helpers/command-schema-helpers.js";
import { parseRequiredString } from "./helpers/command-parse-helpers.js";
import type { ICommandExecutionContext } from "./interfaces/ICommandExecutionContext.js";
import type { ICommandParseResult } from "./interfaces/ICommandParseResult.js";
import type { IListTypeSchemaCommand } from "./interfaces/IListTypeSchemaCommand.js";
import type { ListTypeSchemaInput, ToolResult } from "../tool-types.js";

export class ListTypeSchemaCommand extends BaseCommand<ListTypeSchemaInput> implements IListTypeSchemaCommand {
  constructor() {
    super(
      "listTypeSchema",
      "Show the fields used by a specific list type.",
      [{ name: "listTypeName", type: "string", description: "Name of the list type to show the schema for." }]
    );
  }

  getSchema() {
    return createActionSchema(this.name, {
      listTypeName: Type.String({ minLength: 1, description: "List type name for the `listTypeSchema` action." })
    });
  }

  parse(input: unknown): ICommandParseResult<ListTypeSchemaInput> {
    const listTypeName = parseRequiredString(input, "listTypeName");
    if (!listTypeName.ok) {
      return { ok: false, error: listTypeName.error };
    }
    return {
      ok: true,
      parsed: {
        listTypeName: listTypeName.parsed!
      }
    };
  }

  async execute(parsed: ListTypeSchemaInput, context: ICommandExecutionContext): Promise<ToolResult> {
    context.listTypeRegisterService.startupChecks();
    const info = context.listTypeRegisterService.getListTypeInfo(parsed.listTypeName);
    if (!info) {
      return {
        ok: false,
        error: `Unknown listTypeName: ${parsed.listTypeName}. Available list types: ${context.listTypeRegisterService.listTypeNames().join(", ")}`
      };
    }
    return {
      ok: true,
      listTypeName: info.name,
      description: info.purpose,
      fields: info.fields,
      count: info.fields.length
    };
  }
}
