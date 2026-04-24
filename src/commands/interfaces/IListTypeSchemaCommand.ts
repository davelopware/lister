import type { IListerCommand } from "./IListerCommand.js";

export type ListTypeSchemaInput = {
  listTypeName: string;
};

export interface IListTypeSchemaCommand extends IListerCommand<ListTypeSchemaInput> {}
