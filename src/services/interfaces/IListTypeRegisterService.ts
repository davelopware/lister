export const DEFAULT_LIST_TYPE_NAME = "general" as const;

export type ListerListType = string;
export type ListTypeFieldType = "string" | "number" | "datetime";

export type ListTypeField = {
  name: string;
  type: ListTypeFieldType;
  description: string;
};

export type ListTypeInfo = {
  name: string;
  purpose: string;
  fields: ListTypeField[];
};

export type ListTypeRegistry = {
  types: ListTypeInfo[];
  byName: Map<string, ListTypeInfo>;
};

export interface IListTypeRegisterService {
  startupChecks(): void;
  getListTypesConfigPath(): string;
  isListType(value: string): boolean;
  getListTypeInfo(name: string): ListTypeInfo | undefined;
  listTypeInfos(): ListTypeInfo[];
  listTypeNames(): string[];
  parseItemForListType(listType: string, data: Record<string, unknown>): Record<string, unknown>;
  parsePartialItemForListType(listType: string, data: Record<string, unknown>): Record<string, unknown>;
}
