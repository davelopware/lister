import { createActionSchema } from "./helpers/command-schema-helpers.js";
import { parseNoArgs } from "./helpers/command-parse-helpers.js";
import { BaseCommand } from "./base/BaseCommand.js";
import type { IShowCommandsCommand } from "./interfaces/IShowCommandsCommand.js";
import type { IServices } from "../services/interfaces/IServices.js";
import type { ToolResult } from "../tool-types.js";

export class ShowCommandsCommand extends BaseCommand<Record<string, never>> implements IShowCommandsCommand {
  constructor(services: IServices) {
    super(services, "showCommands", "Show the available Lister commands and what they do.");
  }

  getSchema() {
    return createActionSchema(this.name);
  }

  parse(input: unknown) {
    return parseNoArgs(input);
  }

  async execute(_parsed: Record<string, never>): Promise<ToolResult> {
    const commands = this.services.getCommandRegisterService().getCommands();
    return {
      ok: true,
      commands: commands.map((command) => ({
        name: command.name,
        description: command.description
      })),
      count: commands.length
    };
  }
}
