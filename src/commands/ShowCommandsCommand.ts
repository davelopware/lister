import { BaseCommand } from "./base/BaseCommand.js";
import type { IShowCommandsCommand } from "./interfaces/IShowCommandsCommand.js";
import type { IServices } from "../services/interfaces/IServices.js";
import type { ToolResult } from "../toolTypes.js";

const SHOW_COMMANDS_COMMAND_SETUP = {
  name: "showCommands",
  description: "Show the available Lister commands and what they do."
} as const;

export class ShowCommandsCommand extends BaseCommand<Record<string, never>> implements IShowCommandsCommand {
  constructor(services: IServices) {
    super(services, SHOW_COMMANDS_COMMAND_SETUP);
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
