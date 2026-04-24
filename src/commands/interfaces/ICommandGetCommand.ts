import type { IListerCommand } from "./IListerCommand.js";

export type CommandGetInput = {
  commandName: string;
};

export interface ICommandGetCommand extends IListerCommand<CommandGetInput> {}
