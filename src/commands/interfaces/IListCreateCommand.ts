import type { IListerCommand } from "./IListerCommand.js";

export type ListCreateInput = {
  list: string;
  listType?: string;
  description?: string;
};

export interface IListCreateCommand extends IListerCommand<ListCreateInput> {}
