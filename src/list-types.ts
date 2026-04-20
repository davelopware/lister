import builtinListTypesConfig from "./builtin-list-types.json" with { type: "json" };

const BUILTIN_LIST_TYPE_NAMES = [
  "general",
  "todos",
  "people",
  "habits",
  "shopping-items",
  "health-log",
  "waiting-on"
] as const;

export type ListerListType = (typeof BUILTIN_LIST_TYPE_NAMES)[number];

export interface ListTypeField {
  name: string;
  type: string;
  description: string;
}

export interface ListTypeInfo {
  name: string;
  purpose: string;
  fields: ListTypeField[];
}

interface BuiltinListTypeInfo extends ListTypeInfo {
  name: ListerListType;
}

interface BuiltinListTypesConfig {
  types: BuiltinListTypeInfo[];
}

interface ListTypeParser {
  parseItem: (input: Record<string, unknown>) => Record<string, unknown>;
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

function isListTypeField(value: unknown): value is ListTypeField {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const field = value as Partial<ListTypeField>;
  return (
    typeof field.name === "string" &&
    field.name.trim() !== "" &&
    typeof field.type === "string" &&
    field.type.trim() !== "" &&
    typeof field.description === "string" &&
    field.description.trim() !== ""
  );
}

function loadBuiltinListTypes(config: unknown): Record<ListerListType, BuiltinListTypeInfo> {
  if (typeof config !== "object" || config === null || Array.isArray(config)) {
    throw new Error("Invalid built-in list type config");
  }

  const typedConfig = config as Partial<BuiltinListTypesConfig>;
  if (!Array.isArray(typedConfig.types)) {
    throw new Error("Built-in list type config must contain a types array");
  }

  const remainingNames = new Set<ListerListType>(BUILTIN_LIST_TYPE_NAMES);
  const loaded = {} as Record<ListerListType, BuiltinListTypeInfo>;

  for (const entry of typedConfig.types) {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      throw new Error("Each built-in list type entry must be an object");
    }
    const info = entry as Partial<BuiltinListTypeInfo>;
    if (typeof info.name !== "string" || !remainingNames.has(info.name as ListerListType)) {
      throw new Error(`Unknown built-in list type in config: ${String(info.name)}`);
    }
    if (typeof info.purpose !== "string" || info.purpose.trim() === "") {
      throw new Error(`Built-in list type ${info.name} must define a purpose`);
    }
    if (!Array.isArray(info.fields) || !info.fields.every((field) => isListTypeField(field))) {
      throw new Error(`Built-in list type ${info.name} must define valid fields`);
    }

    const name = info.name as ListerListType;
    loaded[name] = {
      name,
      purpose: info.purpose,
      fields: info.fields
    };
    remainingNames.delete(name);
  }

  if (remainingNames.size > 0) {
    throw new Error(`Missing built-in list types in config: ${[...remainingNames].join(", ")}`);
  }

  return loaded;
}

const BUILTIN_LIST_TYPE_INFO = loadBuiltinListTypes(builtinListTypesConfig);
const BUILTIN_LIST_TYPE_NAME_SET = new Set<ListerListType>(BUILTIN_LIST_TYPE_NAMES);

const PARSERS: Record<ListerListType, ListTypeParser> = {
  general: {
    parseItem(input) {
      exactKeys(input, ["text"]);
      return {
        text: expectString(input.text, "text")
      };
    }
  },
  todos: {
    parseItem(input) {
      exactKeys(input, ["text", "due", "status"]);
      return {
        text: expectString(input.text, "text"),
        due: expectIsoDateString(input.due, "due"),
        status: expectString(input.status, "status")
      };
    }
  },
  people: {
    parseItem(input) {
      exactKeys(input, ["nickname", "name", "email", "phone", "relation", "birthday", "additional"]);
      return {
        nickname: expectString(input.nickname, "nickname"),
        name: expectString(input.name, "name"),
        email: expectString(input.email, "email"),
        phone: expectString(input.phone, "phone"),
        relation: expectString(input.relation, "relation"),
        birthday: expectString(input.birthday, "birthday"),
        additional: expectString(input.additional, "additional")
      };
    }
  },
  habits: {
    parseItem(input) {
      exactKeys(input, ["habit", "frequency", "target", "last_completed", "streak", "notes"]);
      return {
        habit: expectString(input.habit, "habit"),
        frequency: expectString(input.frequency, "frequency"),
        target: expectString(input.target, "target"),
        last_completed: expectIsoDateString(input.last_completed, "last_completed"),
        streak: expectNumber(input.streak, "streak"),
        notes: expectString(input.notes, "notes")
      };
    }
  },
  "shopping-items": {
    parseItem(input) {
      exactKeys(input, ["item", "quantity", "category", "store", "budget", "status"]);
      return {
        item: expectString(input.item, "item"),
        quantity: expectNumber(input.quantity, "quantity"),
        category: expectString(input.category, "category"),
        store: expectString(input.store, "store"),
        budget: expectNumber(input.budget, "budget"),
        status: expectString(input.status, "status")
      };
    }
  },
  "health-log": {
    parseItem(input) {
      exactKeys(input, ["metric", "value", "unit", "recorded_at", "context", "notes"]);
      return {
        metric: expectString(input.metric, "metric"),
        value: expectNumber(input.value, "value"),
        unit: expectString(input.unit, "unit"),
        recorded_at: expectIsoDateString(input.recorded_at, "recorded_at"),
        context: expectString(input.context, "context"),
        notes: expectString(input.notes, "notes")
      };
    }
  },
  "waiting-on": {
    parseItem(input) {
      exactKeys(input, ["subject", "owner", "requested_at", "due_by", "status", "next_follow_up"]);
      return {
        subject: expectString(input.subject, "subject"),
        owner: expectString(input.owner, "owner"),
        requested_at: expectIsoDateString(input.requested_at, "requested_at"),
        due_by: expectIsoDateString(input.due_by, "due_by"),
        status: expectString(input.status, "status"),
        next_follow_up: expectIsoDateString(input.next_follow_up, "next_follow_up")
      };
    }
  }
};

export function isListType(value: string): value is ListerListType {
  return BUILTIN_LIST_TYPE_NAME_SET.has(value as ListerListType);
}

export function listTypeInfos(): ListTypeInfo[] {
  return BUILTIN_LIST_TYPE_NAMES.map((name) => BUILTIN_LIST_TYPE_INFO[name]);
}

export function parseItemForListType(listType: ListerListType, data: Record<string, unknown>): Record<string, unknown> {
  return PARSERS[listType].parseItem(data);
}
