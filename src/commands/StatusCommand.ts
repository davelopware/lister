import { BaseCommand } from "./base/BaseCommand.js";
import { createActionSchema } from "./helpers/command-schema-helpers.js";
import { parseNoArgs } from "./helpers/command-parse-helpers.js";
import type { ICommandExecutionContext } from "./interfaces/ICommandExecutionContext.js";
import type { IStatusCommand } from "./interfaces/IStatusCommand.js";
import type { ToolResult } from "../tool-types.js";
import { LISTER_PACKAGE_VERSION } from "../version.js";
import { pathExists } from "../services/path-utils.js";

export class StatusCommand extends BaseCommand<Record<string, never>> implements IStatusCommand {
  constructor() {
    super("status", "Show the store path, existence, and aggregate list and item counts.");
  }

  getSchema() {
    return createActionSchema(this.name);
  }

  parse(input: unknown) {
    return parseNoArgs(input);
  }

  async execute(_parsed: Record<string, never>, context: ICommandExecutionContext): Promise<ToolResult> {
    context.listTypeRegisterService.startupChecks();
    const storeExists = await pathExists(context.dbPath);
    const customListTypesPath = context.listTypeRegisterService.getListTypesConfigPath();
    const customListTypesExists = await pathExists(customListTypesPath);
    const result = await context.store.stats();
    return {
      ok: true,
      extension_version: LISTER_PACKAGE_VERSION,
      store_path: context.dbPath,
      store_exists: storeExists,
      custom_list_types_path: customListTypesPath,
      custom_list_types_exists: customListTypesExists,
      ...result
    };
  }
}
