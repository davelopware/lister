import { Type } from "@sinclair/typebox";
import { BaseCommand } from "./base/BaseCommand.js";
import { commandArg } from "./helpers/commandSchemaHelpers.js";
import type { CommandGetInput, ICommandGetCommand } from "./interfaces/ICommandGetCommand.js";
import type { IServices } from "../services/interfaces/IServices.js";
import type { ToolResult } from "../toolTypes.js";

const COMMAND_GET_COMMAND_SETUP = {
  name: "commandGet",
  description: "Show the required and optional arguments for a specific command.",
  requiredArgs: [
    commandArg(
      "commandName",
      "string",
      "Name of the command to show the arguments for.",
      (description) => Type.String({ minLength: 1, description })
    )
  ]
} as const;

export class CommandGetCommand extends BaseCommand<CommandGetInput> implements ICommandGetCommand {
  constructor(services: IServices) {
    super(services, COMMAND_GET_COMMAND_SETUP);
  }

  async execute(parsed: CommandGetInput): Promise<ToolResult> {
    const registry = this.services.getCommandRegisterService();
    const command = registry.findCommand(parsed.commandName);
    if (!command) {
      return {
        ok: false,
        error: `Unknown commandName: ${parsed.commandName}. Available commands: ${registry.getCommands().map((entry) => entry.name).join(", ")}`
      };
    }

    return {
      ok: true,
      commandName: command.name,
      description: command.description,
      requiredArgs: command.requiredArgs,
      optionalArgs: command.optionalArgs
    };
  }
}
