import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import builtinListTypesConfig from "./builtin-list-types.json" with { type: "json" };

const LIST_TYPE_CONFIG_PATH_SEGMENTS = ["_config", "custom-list-types.json"] as const;
const LIST_TYPE_NAME_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const SUPPORTED_FIELD_TYPES = ["string", "number", "datetime"] as const;
export const DEFAULT_LIST_TYPE_NAME = "general" as const;

export type ListerListType = string;
export type ListTypeFieldType = (typeof SUPPORTED_FIELD_TYPES)[number];

export interface ListTypeField {
  name: string;
  type: ListTypeFieldType;
  description: string;
}

export interface ListTypeInfo {
  name: string;
  purpose: string;
  fields: ListTypeField[];
}

interface ListTypesConfig {
  types: ListTypeInfo[];
}

interface ListTypeRegistry {
  types: ListTypeInfo[];
  byName: Map<string, ListTypeInfo>;
}

function expectString(value: unknown, fieldName: string): string {
  if (typeof value !== "string") {
    throw new Error(`${fieldName} must be a string`);
  }
  return value;
}

function expectIsoDateString(value: unknown, fieldName: string): string {
  const text = expectString(value, fieldName);
  const parsed = Date.parse(text);
  if (Number.isNaN(parsed)) {
    throw new Error(`${fieldName} must be a valid datetime string`);
  }
  return text;
}

function expectNumber(value: unknown, fieldName: string): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(`${fieldName} must be a number`);
  }
  return value;
}

function exactKeys(input: Record<string, unknown>, allowed: string[]): void {
  const keys = Object.keys(input).sort();
  const expected = [...allowed].sort();
  if (keys.length !== expected.length) {
    throw new Error(`Expected fields: ${expected.join(", ")}`);
  }
  for (let i = 0; i < keys.length; i += 1) {
    if (keys[i] !== expected[i]) {
      throw new Error(`Expected fields: ${expected.join(", ")}`);
    }
  }
}

function isSupportedFieldType(value: unknown): value is ListTypeFieldType {
  return typeof value === "string" && SUPPORTED_FIELD_TYPES.includes(value as ListTypeFieldType);
}

function readString(value: unknown, error: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(error);
  }
  return value;
}

function parseField(value: unknown, typeName: string, fieldIndex: number): ListTypeField {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${typeName}.fields[${fieldIndex}] must be an object`);
  }

  const field = value as Partial<ListTypeField>;
  const name = readString(field.name, `${typeName}.fields[${fieldIndex}].name must be a non-empty string`);
  if (!LIST_TYPE_NAME_PATTERN.test(name)) {
    throw new Error(`${typeName}.fields[${fieldIndex}].name must match ${LIST_TYPE_NAME_PATTERN}`);
  }
  if (!isSupportedFieldType(field.type)) {
    throw new Error(`${typeName}.fields[${fieldIndex}].type must be one of: ${SUPPORTED_FIELD_TYPES.join(", ")}`);
  }
  const description = readString(
    field.description,
    `${typeName}.fields[${fieldIndex}].description must be a non-empty string`
  );

  return { name, type: field.type, description };
}

function parseListTypeEntry(value: unknown, index: number): ListTypeInfo {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`types[${index}] must be an object`);
  }

  const info = value as Partial<ListTypeInfo>;
  const name = readString(info.name, `types[${index}].name must be a non-empty string`);
  if (!LIST_TYPE_NAME_PATTERN.test(name)) {
    throw new Error(`types[${index}].name must match ${LIST_TYPE_NAME_PATTERN}`);
  }
  const purpose = readString(info.purpose, `types[${index}].purpose must be a non-empty string`);
  if (!Array.isArray(info.fields) || info.fields.length === 0) {
    throw new Error(`types[${index}].fields must be a non-empty array`);
  }

  const fields = info.fields.map((field, fieldIndex) => parseField(field, name, fieldIndex));
  const fieldNames = new Set<string>();
  for (const field of fields) {
    if (fieldNames.has(field.name)) {
      throw new Error(`${name}.fields contains duplicate field name: ${field.name}`);
    }
    fieldNames.add(field.name);
  }

  return { name, purpose, fields };
}

function parseListTypesConfig(config: unknown, sourceLabel: string): ListTypeInfo[] {
  if (typeof config !== "object" || config === null || Array.isArray(config)) {
    throw new Error(`${sourceLabel} must be a JSON object`);
  }

  const typedConfig = config as Partial<ListTypesConfig>;
  if (!Array.isArray(typedConfig.types)) {
    throw new Error(`${sourceLabel} must contain a types array`);
  }

  return typedConfig.types.map((entry, index) => parseListTypeEntry(entry, index));
}

function loadBuiltinListTypes(config: unknown): ListTypeInfo[] {
  return parseListTypesConfig(config, "Built-in list type config");
}

function mergeListTypes(builtinTypes: ListTypeInfo[], customTypes: ListTypeInfo[], configPath: string): ListTypeRegistry {
  const merged = [...builtinTypes];
  const byName = new Map<string, ListTypeInfo>();

  for (const entry of builtinTypes) {
    byName.set(entry.name, entry);
  }

  for (const entry of customTypes) {
    if (byName.has(entry.name)) {
      throw new Error(`Duplicate list type "${entry.name}" in ${configPath}; custom types must use unique names`);
    }
    byName.set(entry.name, entry);
    merged.push(entry);
  }

  return { types: merged, byName };
}

async function loadCustomListTypes(configPath: string): Promise<ListTypeInfo[]> {
  try {
    const raw = await readFile(configPath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return parseListTypesConfig(parsed, `List type config at ${configPath}`);
  } catch (error) {
    const asNodeError = error as NodeJS.ErrnoException;
    if (asNodeError.code === "ENOENT") {
      return [];
    }
    if (error instanceof SyntaxError || error instanceof Error) {
      throw new Error(`Invalid list type config at ${configPath}: ${error.message}`);
    }
    throw error;
  }
}

function parseValueForField(field: ListTypeField, value: unknown): string | number {
  switch (field.type) {
    case "string":
      return expectString(value, field.name);
    case "number":
      return expectNumber(value, field.name);
    case "datetime":
      return expectIsoDateString(value, field.name);
  }
}

const BUILTIN_LIST_TYPES = loadBuiltinListTypes(builtinListTypesConfig);

export async function startupChecks(): Promise<void> {
  const builtinNames = BUILTIN_LIST_TYPES.map((entry) => entry.name);
  if (new Set(builtinNames).size !== builtinNames.length) {
    throw new Error("Built-in list types must not contain duplicate names");
  }
  if (!BUILTIN_LIST_TYPES.some((entry) => entry.name === DEFAULT_LIST_TYPE_NAME)) {
    throw new Error(`Built-in list types must include the default list type: ${DEFAULT_LIST_TYPE_NAME}`);
  }
}

export function getListTypesConfigPath(dbPath?: string): string {
  const storePath =
    typeof dbPath === "string" && dbPath.trim() !== ""
      ? resolve(dbPath)
      : resolve(process.cwd(), "lister-store");
  return resolve(storePath, ...LIST_TYPE_CONFIG_PATH_SEGMENTS);
}

export async function loadListTypeRegistry(dbPath?: string): Promise<ListTypeRegistry> {
  const configPath = getListTypesConfigPath(dbPath);
  const customTypes = await loadCustomListTypes(configPath);
  return mergeListTypes(BUILTIN_LIST_TYPES, customTypes, configPath);
}

export async function isListType(value: string, dbPath?: string): Promise<boolean> {
  const registry = await loadListTypeRegistry(dbPath);
  return registry.byName.has(value);
}

export async function getListTypeInfo(name: string, dbPath?: string): Promise<ListTypeInfo | undefined> {
  const registry = await loadListTypeRegistry(dbPath);
  return registry.byName.get(name);
}

export async function listTypeInfos(dbPath?: string): Promise<ListTypeInfo[]> {
  return (await loadListTypeRegistry(dbPath)).types;
}

export async function listTypeNames(dbPath?: string): Promise<string[]> {
  return (await listTypeInfos(dbPath)).map((info) => info.name);
}

export async function parseItemForListType(
  listType: string,
  data: Record<string, unknown>,
  dbPath?: string
): Promise<Record<string, unknown>> {
  const info = await getListTypeInfo(listType, dbPath);
  if (!info) {
    throw new Error(`Unknown list type: ${listType}`);
  }

  exactKeys(
    data,
    info.fields.map((field) => field.name)
  );

  return Object.fromEntries(info.fields.map((field) => [field.name, parseValueForField(field, data[field.name])]));
}
