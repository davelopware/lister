import { createCommandExecutionContext } from "./services/createCommandExecutionContext.js";
import type {
  AddInput,
  ClearInput,
  CommandArgsInput,
  CreateInput,
  ItemRefInput,
  ItemsInput,
  ListTypeSchemaInput,
  ToolContext,
  ToolResult,
  UpdateInput
} from "./tool-types.js";
import { getDefaultCommandRegistry } from "./commands/createDefaultCommandRegistry.js";

async function runCommand(commandName: string, input: unknown, context?: ToolContext): Promise<ToolResult> {
  const registry = getDefaultCommandRegistry();
  const command = registry.findCommand(commandName);
  if (!command) {
    return { ok: false, error: `Unknown command: ${commandName}` };
  }

  const parsed = command.parse(input);
  if (!parsed.ok) {
    return command.buildParseError(parsed);
  }

  return command.execute(parsed.parsed as never, createCommandExecutionContext(registry, context));
}

export async function showCommands(): Promise<ToolResult> {
  return runCommand("showCommands", undefined);
}

export async function commandArgs(input: CommandArgsInput): Promise<ToolResult> {
  return runCommand("commandArgs", input);
}

export async function showListTypes(context?: ToolContext): Promise<ToolResult> {
  return runCommand("showListTypes", undefined, context);
}

export async function listTypeSchema(input: ListTypeSchemaInput, context?: ToolContext): Promise<ToolResult> {
  return runCommand("listTypeSchema", input, context);
}

export const listTypes = showListTypes;

export async function create(input: CreateInput, context?: ToolContext): Promise<ToolResult> {
  return runCommand("create", input, context);
}

export async function lists(context?: ToolContext): Promise<ToolResult> {
  return runCommand("lists", undefined, context);
}

export async function add(input: AddInput, context?: ToolContext): Promise<ToolResult> {
  return runCommand("add", input, context);
}

export async function items(input: ItemsInput, context?: ToolContext): Promise<ToolResult> {
  return runCommand("items", input, context);
}

export async function remove(input: ItemRefInput, context?: ToolContext): Promise<ToolResult> {
  return runCommand("remove", input, context);
}

export async function update(input: UpdateInput, context?: ToolContext): Promise<ToolResult> {
  return runCommand("update", input, context);
}

export async function clear(input: ClearInput, context?: ToolContext): Promise<ToolResult> {
  return runCommand("clear", input, context);
}

export async function status(context?: ToolContext): Promise<ToolResult> {
  return runCommand("status", undefined, context);
}

export type {
  AddInput,
  ClearInput,
  CommandArgsInput,
  CreateInput,
  ItemRefInput,
  ItemsInput,
  ListTypeSchemaInput,
  ToolContext,
  ToolResult,
  UpdateInput
} from "./tool-types.js";
