export type ListerListType = "general" | "todos" | "people" | "habits" | "shopping-items" | "health-log" | "waiting-on";

export interface ListTypeField {
  name: string;
  type: string;
  description: string;
}

export interface ListTypeInfo {
  name: ListerListType;
  purpose: string;
  fields: ListTypeField[];
}

interface ListTypeParser {
  info: ListTypeInfo;
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

const PARSERS: Record<ListerListType, ListTypeParser> = {
  general: {
    info: {
      name: "general",
      purpose: "General-purpose list where each item is a single text note.",
      fields: [
        {
          name: "text",
          type: "string",
          description: "The item content"
        }
      ]
    },
    parseItem(input) {
      exactKeys(input, ["text"]);
      return {
        text: expectString(input.text, "text")
      };
    }
  },
  todos: {
    info: {
      name: "todos",
      purpose: "Task tracking list with due date and workflow status.",
      fields: [
        {
          name: "text",
          type: "string",
          description: "Task description"
        },
        {
          name: "due",
          type: "datetime string",
          description: "Due timestamp in parseable datetime format"
        },
        {
          name: "status",
          type: "string",
          description: "Current task status"
        }
      ]
    },
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
    info: {
      name: "people",
      purpose: "People/contact list with identity, relationship, and notes.",
      fields: [
        {
          name: "nickname",
          type: "string",
          description: "Short or familiar name"
        },
        {
          name: "name",
          type: "string",
          description: "Full name"
        },
        {
          name: "email",
          type: "string",
          description: "Email address"
        },
        {
          name: "phone",
          type: "string",
          description: "Phone number"
        },
        {
          name: "relation",
          type: "string",
          description: "How this person relates to you"
        },
        {
          name: "birthday",
          type: "string",
          description: "Birthday representation"
        },
        {
          name: "additional",
          type: "string",
          description: "Additional notes"
        }
      ]
    },
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
    info: {
      name: "habits",
      purpose: "Recurring habit tracker with cadence and progress context.",
      fields: [
        {
          name: "habit",
          type: "string",
          description: "Habit name"
        },
        {
          name: "frequency",
          type: "string",
          description: "Cadence such as daily or weekly"
        },
        {
          name: "target",
          type: "string",
          description: "Target behavior or quantity"
        },
        {
          name: "last_completed",
          type: "datetime string",
          description: "Last completion timestamp"
        },
        {
          name: "streak",
          type: "number",
          description: "Current streak count"
        },
        {
          name: "notes",
          type: "string",
          description: "Extra notes"
        }
      ]
    },
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
    info: {
      name: "shopping-items",
      purpose: "Shopping planning with quantity, category, and budget context.",
      fields: [
        {
          name: "item",
          type: "string",
          description: "Product or item name"
        },
        {
          name: "quantity",
          type: "number",
          description: "Desired quantity"
        },
        {
          name: "category",
          type: "string",
          description: "Category such as produce or household"
        },
        {
          name: "store",
          type: "string",
          description: "Preferred store"
        },
        {
          name: "budget",
          type: "number",
          description: "Expected spend"
        },
        {
          name: "status",
          type: "string",
          description: "Shopping status"
        }
      ]
    },
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
    info: {
      name: "health-log",
      purpose: "Structured health metric logging for trend and routine tracking.",
      fields: [
        {
          name: "metric",
          type: "string",
          description: "Metric name"
        },
        {
          name: "value",
          type: "number",
          description: "Measured value"
        },
        {
          name: "unit",
          type: "string",
          description: "Measurement unit"
        },
        {
          name: "recorded_at",
          type: "datetime string",
          description: "Measurement timestamp"
        },
        {
          name: "context",
          type: "string",
          description: "Measurement context"
        },
        {
          name: "notes",
          type: "string",
          description: "Additional notes"
        }
      ]
    },
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
    info: {
      name: "waiting-on",
      purpose: "Track delegated or pending responses with follow-up dates.",
      fields: [
        {
          name: "subject",
          type: "string",
          description: "What is pending"
        },
        {
          name: "owner",
          type: "string",
          description: "Who owes the response or action"
        },
        {
          name: "requested_at",
          type: "datetime string",
          description: "When the request was made"
        },
        {
          name: "due_by",
          type: "datetime string",
          description: "Expected completion date"
        },
        {
          name: "status",
          type: "string",
          description: "Current state"
        },
        {
          name: "next_follow_up",
          type: "datetime string",
          description: "Planned follow-up timestamp"
        }
      ]
    },
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
  return (
    value === "general" ||
    value === "todos" ||
    value === "people" ||
    value === "habits" ||
    value === "shopping-items" ||
    value === "health-log" ||
    value === "waiting-on"
  );
}

export function listTypeInfos(): ListTypeInfo[] {
  return Object.values(PARSERS).map((parser) => parser.info);
}

export function parseItemForListType(listType: ListerListType, data: Record<string, unknown>): Record<string, unknown> {
  return PARSERS[listType].parseItem(data);
}