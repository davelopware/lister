import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { isListType, type ListerListType } from "./list-types.js";

const LIST_NAME_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/;

export function getListNameValidationError(listName: string): string | undefined {
  if (typeof listName !== "string" || listName.trim() === "") {
    return "list is required";
  }
  if (!LIST_NAME_PATTERN.test(listName)) {
    return "invalid list name: use 1-64 chars, lowercase a-z, 0-9, '-' or '_', starting with a-z or 0-9";
  }
  return undefined;
}

export interface ListItem {
  id: number;
  createdAt: string;
  updatedAt: string;
  data: Record<string, unknown>;
}

interface ListFile {
  description: string;
  list_type: ListerListType;
  items: ListItem[];
}

const EMPTY_LIST_FILE: ListFile = {
  description: "A description of the list",
  list_type: "general",
  items: []
};

interface ListReadResult {
  exists: boolean;
  list: ListFile;
}

export class ListerStore {
  constructor(private readonly dbDir: string) {}

  async listNames(): Promise<string[]> {
    try {
      const entries = await readdir(this.dbDir, { withFileTypes: true });
      return entries
        .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
        .map((entry) => this.fileNameToListName(entry.name))
        .sort((a, b) => a.localeCompare(b));
    } catch (error) {
      const asNodeError = error as NodeJS.ErrnoException;
      if (asNodeError.code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }

  async add(listName: string, data: Record<string, unknown>, positionId?: number): Promise<ListItem> {
    this.assertValidListName(listName);
    const { list } = await this.readList(listName);
    const now = new Date().toISOString();

    const nextId = list.items.length + 1;
    const targetIndex =
      typeof positionId === "number" && Number.isInteger(positionId) && positionId > 0 && positionId <= nextId
        ? positionId - 1
        : list.items.length;

    const item: ListItem = {
      id: nextId,
      createdAt: now,
      updatedAt: now,
      data
    };

    list.items.splice(targetIndex, 0, item);
    this.reindexItems(list.items);

    const inserted = list.items[targetIndex];
    if (!inserted) {
      throw new Error("Failed to insert item at requested position");
    }

    await this.writeList(listName, list);
    return inserted;
  }

  async createList(listName: string, options?: { description?: string; listType?: ListerListType }): Promise<{ created: boolean; listType: ListerListType; description: string }> {
    this.assertValidListName(listName);
    const existing = await this.readList(listName);
    if (existing.exists) {
      return {
        created: false,
        listType: existing.list.list_type,
        description: existing.list.description
      };
    }

    const list: ListFile = {
      description: options?.description ?? EMPTY_LIST_FILE.description,
      list_type: options?.listType ?? EMPTY_LIST_FILE.list_type,
      items: []
    };
    await this.writeList(listName, list);
    return {
      created: true,
      listType: list.list_type,
      description: list.description
    };
  }

  async getListInfo(listName: string): Promise<{ exists: boolean; listType: ListerListType; description: string }> {
    this.assertValidListName(listName);
    const result = await this.readList(listName);
    return {
      exists: result.exists,
      listType: result.list.list_type,
      description: result.list.description
    };
  }

  async items(listName: string): Promise<ListItem[]> {
    this.assertValidListName(listName);
    const { list } = await this.readList(listName);
    return [...list.items].sort((a, b) => a.id - b.id);
  }

  async remove(listName: string, id: number): Promise<boolean> {
    this.assertValidListName(listName);
    const { list } = await this.readList(listName);
    const index = list.items.findIndex((entry) => entry.id === id);
    if (index === -1) {
      return false;
    }

    list.items.splice(index, 1);
    this.reindexItems(list.items);
    await this.writeList(listName, list);
    return true;
  }

  async update(listName: string, id: number, data: Record<string, unknown>): Promise<ListItem | undefined> {
    this.assertValidListName(listName);
    const { list } = await this.readList(listName);
    const item = list.items.find((entry) => entry.id === id);
    if (!item) {
      return undefined;
    }

    item.data = data;
    item.updatedAt = new Date().toISOString();
    await this.writeList(listName, list);
    return item;
  }

  async clear(listName: string): Promise<number> {
    this.assertValidListName(listName);
    const { list } = await this.readList(listName);
    const count = list.items.length;
    list.items = [];
    await this.writeList(listName, list);
    return count;
  }

  async stats(): Promise<{ lists: number; items: number }> {
    const names = await this.listNames();
    const listData = await Promise.all(names.map(async (name) => (await this.readList(name)).list));
    const allItems = listData.flatMap((list) => list.items);
    return {
      lists: names.length,
      items: allItems.length
    };
  }

  private listFilePath(listName: string): string {
    this.assertValidListName(listName);
    return join(this.dbDir, `${encodeURIComponent(listName)}.json`);
  }

  private assertValidListName(listName: string): void {
    const error = getListNameValidationError(listName);
    if (error) {
      throw new Error(error);
    }
  }

  private fileNameToListName(fileName: string): string {
    const withoutExtension = fileName.slice(0, -5);
    return decodeURIComponent(withoutExtension);
  }

  private isListItem(value: unknown): value is ListItem {
    if (typeof value !== "object" || value === null) {
      return false;
    }
    const entry = value as Partial<ListItem>;
    return (
      typeof entry.id === "number" && Number.isInteger(entry.id) && entry.id > 0 &&
      typeof entry.createdAt === "string" &&
      typeof entry.updatedAt === "string" &&
      typeof entry.data === "object" &&
      entry.data !== null &&
      !Array.isArray(entry.data)
    );
  }

  private reindexItems(items: ListItem[]): void {
    for (let i = 0; i < items.length; i += 1) {
      const entry = items[i];
      if (!entry) {
        continue;
      }
      entry.id = i + 1;
    }
  }

  private parseListFile(raw: string): ListFile {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new Error("Invalid list file format");
    }
    const asList = parsed as { description?: unknown; list_type?: unknown; items?: unknown };
    if (typeof asList.description !== "string") {
      throw new Error("Invalid list description");
    }
    if (typeof asList.list_type !== "string" || !isListType(asList.list_type)) {
      throw new Error("Invalid list_type");
    }
    if (!Array.isArray(asList.items) || !asList.items.every((item) => this.isListItem(item))) {
      throw new Error("Invalid list items");
    }

    return {
      description: asList.description,
      list_type: asList.list_type,
      items: asList.items
    };
  }

  private async readList(listName: string): Promise<ListReadResult> {
    const path = this.listFilePath(listName);
    try {
      const raw = await readFile(path, "utf8");
      return {
        exists: true,
        list: this.parseListFile(raw)
      };
    } catch (error) {
      const asNodeError = error as NodeJS.ErrnoException;
      if (asNodeError.code === "ENOENT") {
        return {
          exists: false,
          list: {
            description: EMPTY_LIST_FILE.description,
            list_type: EMPTY_LIST_FILE.list_type,
            items: []
          }
        };
      }
      throw error;
    }
  }

  private async writeList(listName: string, list: ListFile): Promise<void> {
    await mkdir(this.dbDir, { recursive: true });
    const payload = JSON.stringify(
      {
        description: list.description,
        list_type: list.list_type,
        items: list.items
      },
      null,
      2
    );
    await writeFile(this.listFilePath(listName), `${payload}\n`, "utf8");
  }
}
