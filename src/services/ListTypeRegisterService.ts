/**
 * Runtime registry for built-in and user-defined list types.
 *
 * This service owns three related concerns:
 * - loading bundled and custom type definitions
 * - validating and merging the registry at startup
 * - validating item payloads against the selected type schema
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import builtinListTypesConfig from "../builtin-list-types.json" with { type: "json" };
import {
  DEFAULT_LIST_TYPE_NAME,
  type IListTypeRegisterService,
  type ListTypeField,
  type ListTypeFieldType,
  type ListTypeInfo,
  type ListTypeRegistry
} from "./interfaces/IListTypeRegisterService.js";

const LIST_TYPE_CONFIG_PATH_SEGMENTS = ["_config", "custom-list-types.json"] as const;
const LIST_TYPE_NAME_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const SUPPORTED_FIELD_TYPES = ["string", "number", "datetime"] as const satisfies readonly ListTypeFieldType[];

type ListTypesConfig = {
  types: ListTypeInfo[];
};

export class ListTypeRegisterService implements IListTypeRegisterService {
  private static readonly BUILTIN_LIST_TYPES = ListTypeRegisterService.loadBuiltinListTypes(builtinListTypesConfig);
  private readonly registry: ListTypeRegistry;

  constructor(private readonly dbPath: string) {
    this.startupChecks();
    this.registry = this.loadRegistry();
  }

  startupChecks(): void {
    const builtinNames = ListTypeRegisterService.BUILTIN_LIST_TYPES.map((entry) => entry.name);
    if (new Set(builtinNames).size !== builtinNames.length) {
      throw new Error("Built-in list types must not contain duplicate names");
    }
    if (!ListTypeRegisterService.BUILTIN_LIST_TYPES.some((entry) => entry.name === DEFAULT_LIST_TYPE_NAME)) {
      throw new Error(`Built-in list types must include the default list type: ${DEFAULT_LIST_TYPE_NAME}`);
    }
  }

  getListTypesConfigPath(): string {
    return resolve(this.dbPath, ...LIST_TYPE_CONFIG_PATH_SEGMENTS);
  }

  isListType(value: string): boolean {
    return this.registry.byName.has(value);
  }

  getListTypeInfo(name: string): ListTypeInfo | undefined {
    return this.registry.byName.get(name);
  }

  listTypeInfos(): ListTypeInfo[] {
    return this.registry.types;
  }

  listTypeNames(): string[] {
    return this.listTypeInfos().map((info) => info.name);
  }

  parseItemForListType(listType: string, data: Record<string, unknown>): Record<string, unknown> {
    const info = this.getListTypeInfo(listType);
    if (!info) {
      throw new Error(`Unknown list type: ${listType}`);
    }

    // Lister keeps list items strict: no missing fields and no extras.
    ListTypeRegisterService.exactKeys(
      data,
      info.fields.map((field) => field.name)
    );

    return Object.fromEntries(info.fields.map((field) => [field.name, ListTypeRegisterService.parseValueForField(field, data[field.name])]));
  }

  parsePartialItemForListType(listType: string, data: Record<string, unknown>): Record<string, unknown> {
    const info = this.getListTypeInfo(listType);
    if (!info) {
      throw new Error(`Unknown list type: ${listType}`);
    }

    const fieldsByName = new Map(info.fields.map((field) => [field.name, field]));
    const parsedEntries = Object.entries(data).map(([fieldName, value]) => {
      const field = fieldsByName.get(fieldName);
      if (!field) {
        throw new Error(`Expected fields: ${info.fields.map((entry) => entry.name).sort().join(", ")}`);
      }
      return [fieldName, ListTypeRegisterService.parseValueForField(field, value)];
    });

    return Object.fromEntries(parsedEntries);
  }

  private loadRegistry(): ListTypeRegistry {
    const configPath = this.getListTypesConfigPath();
    const customTypes = this.loadCustomListTypes(configPath);
    return ListTypeRegisterService.mergeListTypes(ListTypeRegisterService.BUILTIN_LIST_TYPES, customTypes, configPath);
  }

  private loadCustomListTypes(configPath: string): ListTypeInfo[] {
    try {
      const raw = readFileSync(configPath, "utf8");
      const parsed = JSON.parse(raw) as unknown;
      return ListTypeRegisterService.parseListTypesConfig(parsed, `List type config at ${configPath}`);
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

  private static expectString(value: unknown, fieldName: string): string {
    if (typeof value !== "string") {
      throw new Error(`${fieldName} must be a string`);
    }
    return value;
  }

  private static expectIsoDateString(value: unknown, fieldName: string): string {
    const text = ListTypeRegisterService.expectString(value, fieldName);
    const parsed = Date.parse(text);
    if (Number.isNaN(parsed)) {
      throw new Error(`${fieldName} must be a valid datetime string`);
    }
    return text;
  }

  private static expectNumber(value: unknown, fieldName: string): number {
    if (typeof value !== "number" || Number.isNaN(value)) {
      throw new Error(`${fieldName} must be a number`);
    }
    return value;
  }

  private static exactKeys(input: Record<string, unknown>, allowed: string[]): void {
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

  private static isSupportedFieldType(value: unknown): value is ListTypeFieldType {
    return typeof value === "string" && SUPPORTED_FIELD_TYPES.includes(value as ListTypeFieldType);
  }

  private static readString(value: unknown, error: string): string {
    if (typeof value !== "string" || value.trim() === "") {
      throw new Error(error);
    }
    return value;
  }

  private static parseField(value: unknown, typeName: string, fieldIndex: number): ListTypeField {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      throw new Error(`${typeName}.fields[${fieldIndex}] must be an object`);
    }

    const field = value as Partial<ListTypeField>;
    const name = ListTypeRegisterService.readString(field.name, `${typeName}.fields[${fieldIndex}].name must be a non-empty string`);
    if (!LIST_TYPE_NAME_PATTERN.test(name)) {
      throw new Error(`${typeName}.fields[${fieldIndex}].name must match ${LIST_TYPE_NAME_PATTERN}`);
    }
    if (!ListTypeRegisterService.isSupportedFieldType(field.type)) {
      throw new Error(`${typeName}.fields[${fieldIndex}].type must be one of: ${SUPPORTED_FIELD_TYPES.join(", ")}`);
    }
    const description = ListTypeRegisterService.readString(
      field.description,
      `${typeName}.fields[${fieldIndex}].description must be a non-empty string`
    );

    return { name, type: field.type, description };
  }

  private static parseListTypeEntry(value: unknown, index: number): ListTypeInfo {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      throw new Error(`types[${index}] must be an object`);
    }

    const info = value as Partial<ListTypeInfo>;
    const name = ListTypeRegisterService.readString(info.name, `types[${index}].name must be a non-empty string`);
    if (!LIST_TYPE_NAME_PATTERN.test(name)) {
      throw new Error(`types[${index}].name must match ${LIST_TYPE_NAME_PATTERN}`);
    }
    const purpose = ListTypeRegisterService.readString(info.purpose, `types[${index}].purpose must be a non-empty string`);
    if (!Array.isArray(info.fields) || info.fields.length === 0) {
      throw new Error(`types[${index}].fields must be a non-empty array`);
    }

    const fields = info.fields.map((field, fieldIndex) => ListTypeRegisterService.parseField(field, name, fieldIndex));
    const fieldNames = new Set<string>();
    for (const field of fields) {
      if (fieldNames.has(field.name)) {
        throw new Error(`${name}.fields contains duplicate field name: ${field.name}`);
      }
      fieldNames.add(field.name);
    }

    return { name, purpose, fields };
  }

  private static parseListTypesConfig(config: unknown, sourceLabel: string): ListTypeInfo[] {
    if (typeof config !== "object" || config === null || Array.isArray(config)) {
      throw new Error(`${sourceLabel} must be a JSON object`);
    }

    const typedConfig = config as Partial<ListTypesConfig>;
    if (!Array.isArray(typedConfig.types)) {
      throw new Error(`${sourceLabel} must contain a types array`);
    }

    return typedConfig.types.map((entry, index) => ListTypeRegisterService.parseListTypeEntry(entry, index));
  }

  private static loadBuiltinListTypes(config: unknown): ListTypeInfo[] {
    return ListTypeRegisterService.parseListTypesConfig(config, "Built-in list type config");
  }

  private static mergeListTypes(builtinTypes: ListTypeInfo[], customTypes: ListTypeInfo[], configPath: string): ListTypeRegistry {
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

  private static parseValueForField(field: ListTypeField, value: unknown): string | number {
    switch (field.type) {
      case "string":
        return ListTypeRegisterService.expectString(value, field.name);
      case "number":
        return ListTypeRegisterService.expectNumber(value, field.name);
      case "datetime":
        return ListTypeRegisterService.expectIsoDateString(value, field.name);
    }
  }
}
