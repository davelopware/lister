import { BaseCommand } from "./base/BaseCommand.js";
import type { ITypeGetAllCommand } from "./interfaces/ITypeGetAllCommand.js";
import type { IServices } from "../services/interfaces/IServices.js";
import type { ToolResult } from "../toolTypes.js";

const TYPE_GET_ALL_COMMAND_SETUP = {
  name: "typeGetAll",
  description: "Show the available list types and their descriptions."
} as const;

export class TypeGetAllCommand extends BaseCommand<Record<string, never>> implements ITypeGetAllCommand {
  constructor(services: IServices) {
    super(services, TYPE_GET_ALL_COMMAND_SETUP);
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
