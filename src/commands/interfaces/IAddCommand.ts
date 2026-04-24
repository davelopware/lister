import type { IListerCommand } from "./IListerCommand.js";

export type AddInput = {
  list: string;
  id?: number;
  data: Record<string, unknown>;
};

export interface IAddCommand extends IListerCommand<AddInput> {}
