import { resolve } from "node:path";
import { getListNameValidationError, ListerStore, type ListItem } from "./store.js";
import { isListType, listTypeInfos, parseItemForListType, type ListerListType } from "./list-types.js";

export interface ToolContext {
  dbPath?: string;
}

export interface AddInput {
  list: string;
  id?: number;
  data: Record<string, unknown>;
}

export interface CreateInput {
  list: string;
  listType?: ListerListType;
  description?: string;
}

export interface ItemsInput {
  list: string;
  limit?: number;
}

export interface ItemRefInput {
  list: string;
  id: number;
}

export interface UpdateInput {
  list: string;
  id: number;
  data: Record<string, unknown>;
}

export interface ClearInput {
  list: string;
  confirm: boolean;
}

export interface ToolResult {
  ok: boolean;
  [key: string]: unknown;
}

interface ListRecord {
  name: string;
  list_type: ListerListType;
  description: string;
}

function getDbPath(context?: ToolContext): string {
  if (context?.dbPath && context.dbPath.trim() !== "") {
    return resolve(context.dbPath);
  }
  const fromEnv = process.env.LISTER_STORE_FOLDER;
  if (fromEnv && fromEnv.trim() !== "") {
    return resolve(fromEnv);
  }
  return resolve(process.cwd(), "lister-store");
}

function getStore(context?: ToolContext): ListerStore {
  return new ListerStore(getDbPath(context));
}

function filterItems(items: ListItem[], limit?: number): ListItem[] {
  if (!limit || Number.isNaN(limit) || limit < 1) {
    return items;
  }
  return items.slice(0, limit);
}

export async function lists(context?: ToolContext): Promise<ToolResult> {
  const store = getStore(context);
  const names = await store.listNames();
  const listRecords: ListRecord[] = [];

  for (const name of names) {
    const info = await store.getListInfo(name);
    listRecords.push({
      name,
      list_type: info.listType,
      description: info.description
    });
  }

  return { ok: true, lists: listRecords, count: listRecords.length };
}

export async function listTypes(): Promise<ToolResult> {
  return {
    ok: true,
    types: listTypeInfos(),
    count: listTypeInfos().length
  };
}

export async function create(input: CreateInput, context?: ToolContext): Promise<ToolResult> {
  const listNameError = getListNameValidationError(input.list);
  if (listNameError) {
    return { ok: false, error: listNameError };
  }
  if (input.listType && !isListType(input.listType)) {
    return { ok: false, error: "listType must be one of: general, todos, people, habits, shopping-items, health-log, waiting-on" };
  }

  const options: { listType?: ListerListType; description?: string } = {};
  if (input.listType) {
    options.listType = input.listType;
  }
  if (typeof input.description === "string") {
    options.description = input.description;
  }

  const result = await getStore(context).createList(input.list, options);

  return {
    ok: true,
    created: result.created,
    list: input.list,
    list_type: result.listType,
    description: result.description
  };
}

export async function add(input: AddInput, context?: ToolContext): Promise<ToolResult> {
  const listNameError = getListNameValidationError(input.list);
  if (listNameError) {
    return { ok: false, error: listNameError };
  }
  if (!input.data || typeof input.data !== "object" || Array.isArray(input.data)) {
    return { ok: false, error: "data must be a JSON object" };
  }
  if (input.id !== undefined && (!Number.isInteger(input.id) || input.id < 1)) {
    return { ok: false, error: "id must be a positive integer when provided" };
  }

  const store = getStore(context);
  const info = await store.getListInfo(input.list);
  if (!isListType(info.listType)) {
    return { ok: false, error: `Unsupported list_type in storage: ${info.listType}` };
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = parseItemForListType(info.listType, input.data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid list item";
    return { ok: false, error: message };
  }

  const item = await store.add(input.list, parsed, input.id);
  return { ok: true, list_type: info.listType, item };
}

export async function items(input: ItemsInput, context?: ToolContext): Promise<ToolResult> {
  const listNameError = getListNameValidationError(input.list);
  if (listNameError) {
    return { ok: false, error: listNameError };
  }
  const found = await getStore(context).items(input.list);
  const selected = filterItems(found, input.limit);
  return { ok: true, list: input.list, count: selected.length, items: selected };
}

export async function remove(input: ItemRefInput, context?: ToolContext): Promise<ToolResult> {
  const listNameError = getListNameValidationError(input.list);
  if (listNameError) {
    return { ok: false, error: listNameError };
  }
  if (!Number.isInteger(input.id) || input.id < 1) {
    return { ok: false, error: "id must be a positive integer" };
  }

  const removed = await getStore(context).remove(input.list, input.id);
  if (!removed) {
    return { ok: false, error: "item not found" };
  }
  return { ok: true, list: input.list, removed: input.id };
}

export async function update(input: UpdateInput, context?: ToolContext): Promise<ToolResult> {
  const listNameError = getListNameValidationError(input.list);
  if (listNameError) {
    return { ok: false, error: listNameError };
  }
  if (!Number.isInteger(input.id) || input.id < 1) {
    return { ok: false, error: "id must be a positive integer" };
  }
  if (!input.data || typeof input.data !== "object" || Array.isArray(input.data)) {
    return { ok: false, error: "data must be a JSON object" };
  }

  const store = getStore(context);
  const info = await store.getListInfo(input.list);
  if (!isListType(info.listType)) {
    return { ok: false, error: `Unsupported list_type in storage: ${info.listType}` };
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = parseItemForListType(info.listType, input.data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid list item";
    return { ok: false, error: message };
  }

  const item = await store.update(input.list, input.id, parsed);
  if (!item) {
    return { ok: false, error: "item not found" };
  }
  return { ok: true, list: input.list, list_type: info.listType, item };
}

export async function clear(input: ClearInput, context?: ToolContext): Promise<ToolResult> {
  const listNameError = getListNameValidationError(input.list);
  if (listNameError) {
    return { ok: false, error: listNameError };
  }
  if (input.confirm !== true) {
    return { ok: false, error: "confirm must be true" };
  }
  const removed = await getStore(context).clear(input.list);
  return { ok: true, list: input.list, removed };
}

export async function stats(context?: ToolContext): Promise<ToolResult> {
  const result = await getStore(context).stats();
  return { ok: true, ...result };
}