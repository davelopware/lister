import type { IListerCommand } from "./IListerCommand.js";

export type ItemsInput = {
  list: string;
  limit?: number;
};

export interface IItemsCommand extends IListerCommand<ItemsInput> {}
