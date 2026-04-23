import { BaseCommand } from "./base/BaseCommand.js";
import { createActionSchema } from "./helpers/command-schema-helpers.js";
import { parseNoArgs } from "./helpers/command-parse-helpers.js";
import type { ICommandExecutionContext } from "./interfaces/ICommandExecutionContext.js";
import type { IShowListTypesCommand } from "./interfaces/IShowListTypesCommand.js";
import type { ToolResult } from "../tool-types.js";

export class ShowListTypesCommand extends BaseCommand<Record<string, never>> implements IShowListTypesCommand {
  constructor() {
    super("showListTypes", "Show the available list types and their descriptions.");
  }

  getSchema() {
    return createActionSchema(this.name);
  }

  parse(input: unknown) {
    return parseNoArgs(input);
  }

  async execute(_parsed: Record<string, never>, context: ICommandExecutionContext): Promise<ToolResult> {
    context.listTypeRegisterService.startupChecks();
    const types = context.listTypeRegisterService.listTypeInfos();
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
