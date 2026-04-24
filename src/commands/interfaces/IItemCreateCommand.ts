import type { IListerCommand } from "./IListerCommand.js";

export type ItemCreateInput = {
  list: string;
  id?: number;
  data: Record<string, unknown>;
};

export interface IItemCreateCommand extends IListerCommand<ItemCreateInput> {}
