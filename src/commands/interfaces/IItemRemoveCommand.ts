import type { IListerCommand } from "./IListerCommand.js";

export type ItemRemoveInput = {
  list: string;
  id: number;
};

export interface IItemRemoveCommand extends IListerCommand<ItemRemoveInput> {}
