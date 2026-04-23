import { BaseCommand } from "./base/BaseCommand.js";
import { createActionSchema } from "./helpers/command-schema-helpers.js";
import { parseNoArgs } from "./helpers/command-parse-helpers.js";
import type { IStatusCommand } from "./interfaces/IStatusCommand.js";
import type { IServices } from "../services/interfaces/IServices.js";
import type { ToolResult } from "../tool-types.js";
import { pathExists } from "../utils/pathUtils.js";
import { LISTER_PACKAGE_VERSION } from "../version.js";

export class StatusCommand extends BaseCommand<Record<string, never>> implements IStatusCommand {
  constructor(services: IServices) {
    super(services, "status", "Show the store path, existence, and aggregate list and item counts.");
  }

  getSchema() {
    return createActionSchema(this.name);
  }

  parse(input: unknown) {
    return parseNoArgs(input);
  }

  async execute(_parsed: Record<string, never>): Promise<ToolResult> {
    const store = this.services.getListerStoreService();
    const dbPath = store.getDbPath();
    const listTypeRegisterService = this.services.getListTypeRegisterService();
    listTypeRegisterService.startupChecks();
    const storeExists = await pathExists(dbPath);
    const customListTypesPath = listTypeRegisterService.getListTypesConfigPath();
    const customListTypesExists = await pathExists(customListTypesPath);
    const result = await store.stats();
    return {
      ok: true,
      extension_version: LISTER_PACKAGE_VERSION,
      store_path: dbPath,
      store_exists: storeExists,
      custom_list_types_path: customListTypesPath,
      custom_list_types_exists: customListTypesExists,
      ...result
    };
  }
}
