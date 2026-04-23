import { BaseCommand } from "./base/BaseCommand.js";
import { createActionSchema } from "./helpers/command-schema-helpers.js";
import { parseNoArgs } from "./helpers/command-parse-helpers.js";
import type { ICommandExecutionContext } from "./interfaces/ICommandExecutionContext.js";
import type { IListsCommand } from "./interfaces/IListsCommand.js";
import type { ToolResult } from "../tool-types.js";

export class ListsCommand extends BaseCommand<Record<string, never>> implements IListsCommand {
  constructor() {
    super("lists", "List all known lists with their type and description.");
  }

  getSchema() {
    return createActionSchema(this.name);
  }

  parse(input: unknown) {
    return parseNoArgs(input);
  }

  async execute(_parsed: Record<string, never>, context: ICommandExecutionContext): Promise<ToolResult> {
    context.listTypeRegisterService.startupChecks();
    const names = await context.store.listNames();
    const lists = [];
    for (const name of names) {
      const info = await context.store.getListInfo(name);
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
