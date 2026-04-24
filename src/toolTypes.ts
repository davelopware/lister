/**
 * Shared input and output shapes for the Lister command surface.
 *
 * In OpenClaw terms, these are the common payload types that sit behind tool
 * parameters and tool results, regardless of whether a call comes through the
 * OpenClaw adapter in `pluginTool.ts` or directly through `tool.ts`.
 *
 * Relative to the other entry-point files, this file is deliberately passive:
 * it defines the shapes, while `tool.ts` executes commands and `pluginTool.ts`
 * adapts them for the OpenClaw runtime.
 */
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
