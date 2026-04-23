import { access } from "node:fs/promises";
import { resolve } from "node:path";
import { getListNameValidationError, ListerStore, type ListItem } from "./store.js";
import {
  getListTypeInfo,
  getListTypesConfigPath,
  isListType,
  listTypeInfos,
  listTypeNames,
  parseItemForListType,
  startupChecks
} from "./list-types.js";
import { LISTER_PACKAGE_VERSION } from "./version.js";

export interface ToolContext {
  dbPath?: string;
}

export interface AddInput {
  list: string;
  id?: number;
  data: Record<string, unknown>;
}

export interface CommandArgsInput {
  commandName: string;
}

export interface CreateInput {
  list: string;
  listType?: string;
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

export interface ListTypeSchemaInput {
  listTypeName: string;
}

export interface ToolResult {
  ok: boolean;
  [key: string]: unknown;
}

interface ListRecord {
  name: string;
  list_type: string;
  description: string;
}

interface CommandArgumentRecord {
  name: string;
  type: string;
  description: string;
}

interface CommandRecord {
  name: string;
  description: string;
  requiredArgs: CommandArgumentRecord[];
  optionalArgs: CommandArgumentRecord[];
}

const COMMANDS: CommandRecord[] = [
  {
    name: "showCommands",
    description: "Show the available Lister commands and what they do.",
    requiredArgs: [],
    optionalArgs: []
  },
  {
    name: "commandArgs",
    description: "Show the required and optional arguments for a specific command.",
    requiredArgs: [
      {
        name: "commandName",
        type: "string",
        description: "Name of the command to show the arguments for."
      }
    ],
    optionalArgs: []
  },
  {
    name: "showListTypes",
    description: "Show the available list types and their descriptions.",
    requiredArgs: [],
    optionalArgs: []
  },
  {
    name: "listTypeSchema",
    description: "Show the fields used by a specific list type.",
    requiredArgs: [
      {
        name: "listTypeName",
        type: "string",
        description: "Name of the list type to show the schema for."
      }
    ],
    optionalArgs: []
  },
  {
    name: "create",
    description: "Create a list with an optional type and description.",
    requiredArgs: [
      {
        name: "list",
        type: "string",
        description: "List name to create."
      }
    ],
    optionalArgs: [
      {
        name: "listType",
        type: "string",
        description: "List type name for the new list."
      },
      {
        name: "description",
        type: "string",
        description: "Human-readable description for the list."
      }
    ]
  },
  {
    name: "lists",
    description: "List all known lists with their type and description.",
    requiredArgs: [],
    optionalArgs: []
  },
  {
    name: "add",
    description: "Add an item to a list, optionally inserting at a 1-based position.",
    requiredArgs: [
      {
        name: "list",
        type: "string",
        description: "List name to add the item to."
      },
      {
        name: "data",
        type: "object",
        description: "Item payload that matches the list type schema."
      }
    ],
    optionalArgs: [
      {
        name: "id",
        type: "number",
        description: "1-based position to insert at. If omitted, append to the end."
      }
    ]
  },
  {
    name: "items",
    description: "Return items from a list, optionally limited.",
    requiredArgs: [
      {
        name: "list",
        type: "string",
        description: "List name to read from."
      }
    ],
    optionalArgs: [
      {
        name: "limit",
        type: "number",
        description: "Maximum number of items to return."
      }
    ]
  },
  {
    name: "remove",
    description: "Remove an item from a list by its 1-based position id.",
    requiredArgs: [
      {
        name: "list",
        type: "string",
        description: "List name to remove the item from."
      },
      {
        name: "id",
        type: "number",
        description: "1-based item id to remove."
      }
    ],
    optionalArgs: []
  },
  {
    name: "update",
    description: "Replace an existing item in a list by its 1-based position id.",
    requiredArgs: [
      {
        name: "list",
        type: "string",
        description: "List name to update."
      },
      {
        name: "id",
        type: "number",
        description: "1-based item id to update."
      },
      {
        name: "data",
        type: "object",
        description: "Full item payload that matches the list type schema."
      }
    ],
    optionalArgs: []
  },
  {
    name: "clear",
    description: "Remove all items from a list.",
    requiredArgs: [
      {
        name: "list",
        type: "string",
        description: "List name to clear."
      },
      {
        name: "confirm",
        type: "boolean",
        description: "Must be true to confirm the destructive clear."
      }
    ],
    optionalArgs: []
  },
  {
    name: "status",
    description: "Show the store path, existence, and aggregate list and item counts.",
    requiredArgs: [],
    optionalArgs: []
  }
];

function getCommandByName(commandName: string): CommandRecord | undefined {
  return COMMANDS.find((command) => command.name === commandName);
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

async function runStartupChecks(): Promise<void> {
  await startupChecks();
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function filterItems(items: ListItem[], limit?: number): ListItem[] {
  if (!limit || Number.isNaN(limit) || limit < 1) {
    return items;
  }
  return items.slice(0, limit);
}

export async function lists(context?: ToolContext): Promise<ToolResult> {
  await runStartupChecks();
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

export async function showCommands(): Promise<ToolResult> {
  return {
    ok: true,
    commands: COMMANDS.map((command) => ({
      name: command.name,
      description: command.description
    })),
    count: COMMANDS.length
  };
}

export async function commandArgs(input: CommandArgsInput): Promise<ToolResult> {
  if (!input || typeof input.commandName !== "string" || input.commandName.trim() === "") {
    return { ok: false, error: "commandName is required" };
  }

  const command = getCommandByName(input.commandName);
  if (!command) {
    return {
      ok: false,
      error: `Unknown commandName: ${input.commandName}. Available commands: ${COMMANDS.map((entry) => entry.name).join(", ")}`
    };
  }

  return {
    ok: true,
    commandName: command.name,
    description: command.description,
    requiredArgs: command.requiredArgs,
    optionalArgs: command.optionalArgs
  };
}

export async function showListTypes(context?: ToolContext): Promise<ToolResult> {
  await runStartupChecks();
  const types = await listTypeInfos(getDbPath(context));
  return {
    ok: true,
    listTypes: types.map((type) => ({
      name: type.name,
      description: type.purpose
    })),
    count: types.length
  };
}

export async function listTypeSchema(input: ListTypeSchemaInput, context?: ToolContext): Promise<ToolResult> {
  await runStartupChecks();
  if (!input || typeof input.listTypeName !== "string" || input.listTypeName.trim() === "") {
    return { ok: false, error: "listTypeName is required" };
  }

  const info = await getListTypeInfo(input.listTypeName, getDbPath(context));
  if (!info) {
    return {
      ok: false,
      error: `Unknown listTypeName: ${input.listTypeName}. Available list types: ${(await listTypeNames(getDbPath(context))).join(", ")}`
    };
  }

  return {
    ok: true,
    listTypeName: info.name,
    description: info.purpose,
    fields: info.fields,
    count: info.fields.length
  };
}

export const listTypes = showListTypes;

export async function create(input: CreateInput, context?: ToolContext): Promise<ToolResult> {
  await runStartupChecks();
  const listNameError = getListNameValidationError(input.list);
  if (listNameError) {
    return { ok: false, error: listNameError };
  }
  const dbPath = getDbPath(context);
  if (input.listType && !(await isListType(input.listType, dbPath))) {
    return {
      ok: false,
      error: `Unknown listType: ${input.listType}. Available types: ${(await listTypeNames(dbPath)).join(", ")}`
    };
  }

  const options: { listType?: string; description?: string } = {};
  if (input.listType) {
    options.listType = input.listType;
  }
  if (typeof input.description === "string") {
    options.description = input.description;
  }

  const result = await new ListerStore(dbPath).createList(input.list, options);

  return {
    ok: true,
    created: result.created,
    list: input.list,
    list_type: result.listType,
    description: result.description
  };
}

export async function add(input: AddInput, context?: ToolContext): Promise<ToolResult> {
  await runStartupChecks();
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

  let parsed: Record<string, unknown>;
  try {
    parsed = await parseItemForListType(info.listType, input.data, getDbPath(context));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid list item";
    return { ok: false, error: message };
  }

  const item = await store.add(input.list, parsed, input.id);
  return { ok: true, list_type: info.listType, item };
}

export async function items(input: ItemsInput, context?: ToolContext): Promise<ToolResult> {
  await runStartupChecks();
  const listNameError = getListNameValidationError(input.list);
  if (listNameError) {
    return { ok: false, error: listNameError };
  }
  const found = await getStore(context).items(input.list);
  const selected = filterItems(found, input.limit);
  return { ok: true, list: input.list, count: selected.length, items: selected };
}

export async function remove(input: ItemRefInput, context?: ToolContext): Promise<ToolResult> {
  await runStartupChecks();
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
  await runStartupChecks();
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

  let parsed: Record<string, unknown>;
  try {
    parsed = await parseItemForListType(info.listType, input.data, getDbPath(context));
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
  await runStartupChecks();
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

export async function status(context?: ToolContext): Promise<ToolResult> {
  await runStartupChecks();
  const storePath = getDbPath(context);
  const storeExists = await pathExists(storePath);
  const customListTypesPath = getListTypesConfigPath(storePath);
  const customListTypesExists = await pathExists(customListTypesPath);
  const result = await getStore(context).stats();
  return {
    ok: true,
    extension_version: LISTER_PACKAGE_VERSION,
    store_path: storePath,
    store_exists: storeExists,
    custom_list_types_path: customListTypesPath,
    custom_list_types_exists: customListTypesExists,
    ...result
  };
}
