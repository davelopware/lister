import { Type } from "@sinclair/typebox";
import { BaseCommand } from "./base/BaseCommand.js";
import { commandArg } from "./helpers/commandSchemaHelpers.js";
import type { ITypeGetCommand, TypeGetInput } from "./interfaces/ITypeGetCommand.js";
import type { IServices } from "../services/interfaces/IServices.js";
import type { ToolResult } from "../toolTypes.js";

const TYPE_GET_COMMAND_SETUP = {
  name: "typeGet",
  description: "Show the fields used by a specific list type.",
  requiredArgs: [
    commandArg(
      "listTypeName",
      "string",
      "Name of the list type to show the schema for.",
      (description) => Type.String({ minLength: 1, description })
    )
  ]
} as const;

export class TypeGetCommand extends BaseCommand<TypeGetInput> implements ITypeGetCommand {
  constructor(services: IServices) {
    super(services, TYPE_GET_COMMAND_SETUP);
  }

  async execute(parsed: TypeGetInput): Promise<ToolResult> {
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
