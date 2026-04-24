import type { IListerCommand } from "./IListerCommand.js";

export type ClearInput = {
  list: string;
  confirm: boolean;
};

export interface IClearCommand extends IListerCommand<ClearInput> {}
