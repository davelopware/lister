import { BaseCommand } from "./base/BaseCommand.js";
import { createActionSchema } from "./helpers/command-schema-helpers.js";
import { parseNoArgs } from "./helpers/command-parse-helpers.js";
import type { IShowListTypesCommand } from "./interfaces/IShowListTypesCommand.js";
import type { IServices } from "../services/interfaces/IServices.js";
import type { ToolResult } from "../tool-types.js";

export class ShowListTypesCommand extends BaseCommand<Record<string, never>> implements IShowListTypesCommand {
  constructor(services: IServices) {
    super(services, "showListTypes", "Show the available list types and their descriptions.");
  }

  getSchema() {
    return createActionSchema(this.name);
  }

  parse(input: unknown) {
    return parseNoArgs(input);
  }

  async execute(_parsed: Record<string, never>): Promise<ToolResult> {
    const listTypeRegisterService = this.services.getListTypeRegisterService();
    listTypeRegisterService.startupChecks();
    const types = listTypeRegisterService.listTypeInfos();
    return {
      ok: true,
      listTypes: types.map((type) => ({
        name: type.name,
        description: type.purpose
      })),
      count: types.length
    };
  }
}
