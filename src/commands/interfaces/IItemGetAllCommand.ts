import type { IListerCommand } from "./IListerCommand.js";

export type ItemGetAllInput = {
  list: string;
  limit?: number;
};

export interface IItemGetAllCommand extends IListerCommand<ItemGetAllInput> {}
