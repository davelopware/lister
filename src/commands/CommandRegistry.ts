import { Type } from "@sinclair/typebox";
import type { ICommandRegistry } from "./interfaces/ICommandRegistry.js";
import type { IListerCommand } from "./interfaces/IListerCommand.js";

export class CommandRegistry implements ICommandRegistry {
  private commands: readonly IListerCommand[] = [];

  constructor(commands: readonly IListerCommand[] = []) {
    this.commands = commands;
  }

  getCommands(): readonly IListerCommand[] {
    return this.commands;
  }

  setCommands(commands: readonly IListerCommand[]): void {
    this.commands = commands;
  }

  findCommand(commandName: string): IListerCommand | undefined {
    for (const command of this.commands) {
      if (command.canHandle(commandName)) {
        return command;
      }
    }
    return undefined;
  }

  buildSchema() {
    return Type.Union(this.commands.map((command) => command.getSchema()));
  }
}
