import type { IListerCommand } from "./IListerCommand.js";

export type ListRemoveInput = {
  list: string;
  confirm: boolean;
};

export interface IListRemoveCommand extends IListerCommand<ListRemoveInput> {}
