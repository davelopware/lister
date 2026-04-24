import { Type } from "@sinclair/typebox";
import { BaseCommand } from "./base/BaseCommand.js";
import { commandArg } from "./helpers/commandSchemaHelpers.js";
import { parseRequiredString } from "./helpers/commandParseHelpers.js";
import type { ICommandParseResult } from "./interfaces/ICommandParseResult.js";
import type { IListTypeSchemaCommand } from "./interfaces/IListTypeSchemaCommand.js";
import type { IServices } from "../services/interfaces/IServices.js";
import type { ListTypeSchemaInput, ToolResult } from "../toolTypes.js";

const LIST_TYPE_SCHEMA_COMMAND_SETUP = {
  name: "listTypeSchema",
  description: "Show the fields used by a specific list type.",
  requiredArgs: [
    commandArg("listTypeName", "string", "Name of the list type to show the schema for.", (description) =>
      Type.String({ minLength: 1, description })
    )
  ]
} as const;

export class ListTypeSchemaCommand extends BaseCommand<ListTypeSchemaInput> implements IListTypeSchemaCommand {
  constructor(services: IServices) {
    super(services, LIST_TYPE_SCHEMA_COMMAND_SETUP);
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

  async execute(parsed: ListTypeSchemaInput): Promise<ToolResult> {
    const listTypeRegisterService = this.services.getListTypeRegisterService();
    listTypeRegisterService.startupChecks();
    const info = listTypeRegisterService.getListTypeInfo(parsed.listTypeName);
    if (!info) {
      return {
        ok: false,
        error: `Unknown listTypeName: ${parsed.listTypeName}. Available list types: ${listTypeRegisterService.listTypeNames().join(", ")}`
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
