import { BaseCommand } from "./base/BaseCommand.js";
import type { ICommandGetAllCommand } from "./interfaces/ICommandGetAllCommand.js";
import type { IServices } from "../services/interfaces/IServices.js";
import type { ToolResult } from "../toolTypes.js";

const COMMAND_GET_ALL_COMMAND_SETUP = {
  name: "commandGetAll",
  description: "Show the available Lister commands and what they do."
} as const;

export class CommandGetAllCommand extends BaseCommand<Record<string, never>> implements ICommandGetAllCommand {
  constructor(services: IServices) {
    super(services, COMMAND_GET_ALL_COMMAND_SETUP);
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
