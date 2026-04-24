import type { IListerCommand } from "./IListerCommand.js";

export type TypeGetInput = {
  listTypeName: string;
};

export interface ITypeGetCommand extends IListerCommand<TypeGetInput> {}
