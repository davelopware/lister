import { BaseCommand } from "./base/BaseCommand.js";
import type { IListsGetCommand } from "./interfaces/IListsGetCommand.js";
import type { IServices } from "../services/interfaces/IServices.js";
import type { ToolResult } from "../toolTypes.js";

const LISTS_GET_COMMAND_SETUP = {
  name: "listsGet",
  description: "List all known lists with their type and description."
} as const;

export class ListsGetCommand extends BaseCommand<Record<string, never>> implements IListsGetCommand {
  constructor(services: IServices) {
    super(services, LISTS_GET_COMMAND_SETUP);
  }

  async execute(_parsed: Record<string, never>): Promise<ToolResult> {
    this.services.getListTypeRegisterService().startupChecks();
    const store = this.services.getListerStoreService();
    const names = await store.listNames();
    const lists = [];
    for (const name of names) {
      const info = await store.getListInfo(name);
      lists.push({
        name,
        list_type: info.listType,
        description: info.description
      });
    }
    return {
      ok: true,
      lists,
      count: lists.length
    };
  }
}
