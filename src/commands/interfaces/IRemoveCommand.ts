import type { IListerCommand } from "./IListerCommand.js";

export type ItemRefInput = {
  list: string;
  id: number;
};

export interface IRemoveCommand extends IListerCommand<ItemRefInput> {}
