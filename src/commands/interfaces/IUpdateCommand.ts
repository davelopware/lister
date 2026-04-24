import type { IListerCommand } from "./IListerCommand.js";

export type UpdateInput = {
  list: string;
  id: number;
  data: Record<string, unknown>;
};

export interface IUpdateCommand extends IListerCommand<UpdateInput> {}
