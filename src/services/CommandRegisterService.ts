/**
 * Registry for the ordered set of available Lister commands.
 *
 * The command layer is the source of truth for both runtime dispatch and the
 * OpenClaw tool schema, so this service stays narrow: find commands by name
 * and project their metadata into a union schema.
 */
import { Type } from "@sinclair/typebox";
import type { IListerCommand } from "../commands/interfaces/IListerCommand.js";
import type { ICommandRegisterService } from "./interfaces/ICommandRegisterService.js";
import type { IServices } from "./interfaces/IServices.js";

export class CommandRegisterService implements ICommandRegisterService {
  private commands: readonly IListerCommand[] = [];

  constructor(private readonly services: IServices, commands: readonly IListerCommand[] = []) {
    this.commands = commands;
  }

  getServices(): IServices {
    return this.services;
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
