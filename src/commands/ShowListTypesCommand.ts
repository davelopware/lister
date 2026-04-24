import { BaseCommand } from "./base/BaseCommand.js";
import type { IShowListTypesCommand } from "./interfaces/IShowListTypesCommand.js";
import type { IServices } from "../services/interfaces/IServices.js";
import type { ToolResult } from "../toolTypes.js";

const SHOW_LIST_TYPES_COMMAND_SETUP = {
  name: "showListTypes",
  description: "Show the available list types and their descriptions."
} as const;

export class ShowListTypesCommand extends BaseCommand<Record<string, never>> implements IShowListTypesCommand {
  constructor(services: IServices) {
    super(services, SHOW_LIST_TYPES_COMMAND_SETUP);
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
