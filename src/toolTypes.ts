/**
 * Shared tool-wide shapes for the Lister command surface.
 *
 * Per-command input payloads live alongside their command interfaces under
 * `src/commands/interfaces/`. This file is reserved for the runtime context
 * and result contracts that are shared across the whole tool surface.
 */
export interface ToolContext {
  dbPath?: string;
}

export interface ToolResult {
  ok: boolean;
  [key: string]: unknown;
}
