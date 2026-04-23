import type { TSchema } from "@sinclair/typebox";
import type { IListerCommand } from "./IListerCommand.js";

export interface ICommandRegistry {
  getCommands(): readonly IListerCommand[];
  setCommands(commands: readonly IListerCommand[]): void;
  findCommand(commandName: string): IListerCommand | undefined;
  buildSchema(): TSchema;
}
