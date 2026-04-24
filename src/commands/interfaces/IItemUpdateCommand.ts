import type { IListerCommand } from "./IListerCommand.js";

export type ItemUpdateInput = {
  list: string;
  id: number;
  data: Record<string, unknown>;
};

export interface IItemUpdateCommand extends IListerCommand<ItemUpdateInput> {}
