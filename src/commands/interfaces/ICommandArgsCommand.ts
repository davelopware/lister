import type { IListerCommand } from "./IListerCommand.js";

export type CommandArgsInput = {
  commandName: string;
};

export interface ICommandArgsCommand extends IListerCommand<CommandArgsInput> {}
