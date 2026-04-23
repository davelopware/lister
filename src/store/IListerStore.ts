import type { ListerListType } from "../services/IListTypeRegisterService.js";

export type ListItem = {
  id: number;
  createdAt: string;
  updatedAt: string;
  data: Record<string, unknown>;
};

export type ListFile = {
  version: string;
  description: string;
  list_type: ListerListType;
  items: ListItem[];
};

export type ListReadResult = {
  exists: boolean;
  list: ListFile;
};

export interface IListerStore {
  listNames(): Promise<string[]>;
  add(listName: string, data: Record<string, unknown>, positionId?: number): Promise<ListItem>;
  createList(
    listName: string,
    options?: { description?: string; listType?: ListerListType }
  ): Promise<{ created: boolean; listType: ListerListType; description: string }>;
  getListInfo(listName: string): Promise<{ exists: boolean; listType: ListerListType; description: string }>;
  items(listName: string): Promise<ListItem[]>;
  remove(listName: string, id: number): Promise<boolean>;
  update(listName: string, id: number, data: Record<string, unknown>): Promise<ListItem | undefined>;
  clear(listName: string): Promise<number>;
  stats(): Promise<{ lists: number; items: number }>;
}
