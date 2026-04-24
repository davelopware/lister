/**
 * Core Lister command surface and service bootstrap.
 *
 * This is the main non-OpenClaw-specific entry point for Lister. It wires the
 * concrete services into the DI container, exposes the callable Lister command
 * functions, and dispatches commands through the command register service.
 *
 * Relative to the other entry-point files:
 * - `pluginTool.ts` wraps this surface for OpenClaw plugin execution
 * - `toolTypes.ts` defines shared runtime context/result shapes used here
 * - `index.ts` re-exports this API as part of the package public surface
*/
import { resolveDbPath } from "./utils/pathUtils.js";
import type { IServices } from "./services/interfaces/IServices.js";
import { Services } from "./services/Services.js";
import { ListerStoreService } from "./services/ListerStoreService.js";
import { ListTypeRegisterService } from "./services/ListTypeRegisterService.js";
import { CommandRegisterService } from "./services/CommandRegisterService.js";
import type { IListerCommand } from "./commands/interfaces/IListerCommand.js";
import { AddCommand } from "./commands/AddCommand.js";
import { ClearCommand } from "./commands/ClearCommand.js";
import { CommandArgsCommand } from "./commands/CommandArgsCommand.js";
import { CreateCommand } from "./commands/CreateCommand.js";
import { ItemsCommand } from "./commands/ItemsCommand.js";
import { ListsCommand } from "./commands/ListsCommand.js";
import { ListTypeSchemaCommand } from "./commands/ListTypeSchemaCommand.js";
import { RemoveCommand } from "./commands/RemoveCommand.js";
import { ShowCommandsCommand } from "./commands/ShowCommandsCommand.js";
import { ShowListTypesCommand } from "./commands/ShowListTypesCommand.js";
import { StatusCommand } from "./commands/StatusCommand.js";
import { UpdateCommand } from "./commands/UpdateCommand.js";
import type { AddInput } from "./commands/interfaces/IAddCommand.js";
import type { ClearInput } from "./commands/interfaces/IClearCommand.js";
import type { CommandArgsInput } from "./commands/interfaces/ICommandArgsCommand.js";
import type { CreateInput } from "./commands/interfaces/ICreateCommand.js";
import type { ItemsInput } from "./commands/interfaces/IItemsCommand.js";
import type { ListTypeSchemaInput } from "./commands/interfaces/IListTypeSchemaCommand.js";
import type { ItemRefInput } from "./commands/interfaces/IRemoveCommand.js";
import type { UpdateInput } from "./commands/interfaces/IUpdateCommand.js";
import type {
  ToolContext,
  ToolResult,
} from "./toolTypes.js";

export function configureServices(services: IServices, dbPath: string): IServices {
  const listTypeRegisterService = new ListTypeRegisterService(dbPath);
  services.setListTypeRegisterService(listTypeRegisterService);

  const listerStoreService = new ListerStoreService(dbPath, listTypeRegisterService);
  services.setListerStoreService(listerStoreService);

  const commandRegisterService = new CommandRegisterService(services);
  services.setCommandRegisterService(commandRegisterService);

  const commands: readonly IListerCommand[] = [
    new ShowCommandsCommand(services),
    new CommandArgsCommand(services),
    new ShowListTypesCommand(services),
    new ListTypeSchemaCommand(services),
    new CreateCommand(services),
    new ListsCommand(services),
    new AddCommand(services),
    new ItemsCommand(services),
    new RemoveCommand(services),
    new UpdateCommand(services),
    new ClearCommand(services),
    new StatusCommand(services)
  ];

  commandRegisterService.setCommands(commands);
  return services;
}

const services = new Services();
configureServices(services, resolveDbPath());

async function runCommand(commandName: string, input: unknown, context?: ToolContext): Promise<ToolResult> {
  const dbPath = resolveDbPath(context);
  if (services.getListerStoreService().getDbPath() !== dbPath) {
    configureServices(services, dbPath);
  }

  const registry = services.getCommandRegisterService();
  const command = registry.findCommand(commandName);
  if (!command) {
    return { ok: false, error: `Unknown command: ${commandName}` };
  }

  const parseResult = command.parse(input);
  if (!parseResult.ok) {
    return command.buildParseError(parseResult);
  }

  return command.execute(parseResult.parsed as never);
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
  ToolContext,
  ToolResult
} from "./toolTypes.js";
