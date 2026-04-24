import type { IListerCommand } from "./IListerCommand.js";

export type ListClearInput = {
  list: string;
  confirm: boolean;
};

export interface IListClearCommand extends IListerCommand<ListClearInput> {}
