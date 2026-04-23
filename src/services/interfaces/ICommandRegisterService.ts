import type { TSchema } from "@sinclair/typebox";
import type { IListerCommand } from "../../commands/interfaces/IListerCommand.js";
import type { IServices } from "./IServices.js";

export interface ICommandRegisterService {
  getServices(): IServices;
  getCommands(): readonly IListerCommand[];
  setCommands(commands: readonly IListerCommand[]): void;
  findCommand(commandName: string): IListerCommand | undefined;
  buildSchema(): TSchema;
}
