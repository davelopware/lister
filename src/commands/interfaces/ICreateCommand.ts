import type { IListerCommand } from "./IListerCommand.js";

export type CreateInput = {
  list: string;
  listType?: string;
  description?: string;
};

export interface ICreateCommand extends IListerCommand<CreateInput> {}
