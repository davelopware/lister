import { Type } from "@sinclair/typebox";
import { BaseCommand } from "./base/BaseCommand.js";
import { createActionSchema } from "./helpers/command-schema-helpers.js";
import { parseRequiredString } from "./helpers/command-parse-helpers.js";
import type { ICommandArgsCommand } from "./interfaces/ICommandArgsCommand.js";
import type { ICommandExecutionContext } from "./interfaces/ICommandExecutionContext.js";
import type { ICommandParseResult } from "./interfaces/ICommandParseResult.js";
import type { ICommandRegistry } from "./interfaces/ICommandRegistry.js";
import type { CommandArgsInput, ToolResult } from "../tool-types.js";

export class CommandArgsCommand extends BaseCommand<CommandArgsInput> implements ICommandArgsCommand {
  constructor(private readonly registry: ICommandRegistry) {
    super(
      "commandArgs",
      "Show the required and optional arguments for a specific command.",
      [{ name: "commandName", type: "string", description: "Name of the command to show the arguments for." }]
    );
  }

  getSchema() {
    return createActionSchema(this.name, {
      commandName: Type.String({ minLength: 1, description: "Command name for the `commandArgs` action." })
    });
  }

  parse(input: unknown): ICommandParseResult<CommandArgsInput> {
    const commandName = parseRequiredString(input, "commandName");
    if (!commandName.ok) {
      return { ok: false, error: commandName.error };
    }
    return {
      ok: true,
      parsed: {
        commandName: commandName.parsed!
      }
    };
  }

  async execute(parsed: CommandArgsInput, _context: ICommandExecutionContext): Promise<ToolResult> {
    const command = this.registry.findCommand(parsed.commandName);
    if (!command) {
      return {
        ok: false,
        error: `Unknown commandName: ${parsed.commandName}. Available commands: ${this.registry.getCommands().map((entry) => entry.name).join(", ")}`
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
