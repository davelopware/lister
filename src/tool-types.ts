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
