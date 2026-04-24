import { BaseCommand } from "./base/BaseCommand.js";
import { parseNoArgs } from "./helpers/commandParseHelpers.js";
import type { IListsCommand } from "./interfaces/IListsCommand.js";
import type { IServices } from "../services/interfaces/IServices.js";
import type { ToolResult } from "../toolTypes.js";

const LISTS_COMMAND_SETUP = {
  name: "lists",
  description: "List all known lists with their type and description."
} as const;

export class ListsCommand extends BaseCommand<Record<string, never>> implements IListsCommand {
  constructor(services: IServices) {
    super(services, LISTS_COMMAND_SETUP);
  }

  parse(input: unknown) {
    return parseNoArgs(input);
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
