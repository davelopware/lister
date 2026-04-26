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
import { ItemCreateCommand } from "./commands/ItemCreateCommand.js";
import { ListClearCommand } from "./commands/ListClearCommand.js";
import { ListRemoveCommand } from "./commands/ListRemoveCommand.js";
import { CommandGetCommand } from "./commands/CommandGetCommand.js";
import { ListCreateCommand } from "./commands/ListCreateCommand.js";
import { ItemGetAllCommand } from "./commands/ItemGetAllCommand.js";
import { ListsGetCommand } from "./commands/ListsGetCommand.js";
import { TypeGetCommand } from "./commands/TypeGetCommand.js";
import { ItemRemoveCommand } from "./commands/ItemRemoveCommand.js";
import { CommandGetAllCommand } from "./commands/CommandGetAllCommand.js";
import { TypeGetAllCommand } from "./commands/TypeGetAllCommand.js";
import { StatusCommand } from "./commands/StatusCommand.js";
import { ItemUpdateCommand } from "./commands/ItemUpdateCommand.js";
import type { ItemCreateInput } from "./commands/interfaces/IItemCreateCommand.js";
import type { ListClearInput } from "./commands/interfaces/IListClearCommand.js";
import type { ListRemoveInput } from "./commands/interfaces/IListRemoveCommand.js";
import type { CommandGetInput } from "./commands/interfaces/ICommandGetCommand.js";
import type { ListCreateInput } from "./commands/interfaces/IListCreateCommand.js";
import type { ItemGetAllInput } from "./commands/interfaces/IItemGetAllCommand.js";
import type { TypeGetInput } from "./commands/interfaces/ITypeGetCommand.js";
import type { ItemRemoveInput } from "./commands/interfaces/IItemRemoveCommand.js";
import type { ItemUpdateInput } from "./commands/interfaces/IItemUpdateCommand.js";
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
    new CommandGetAllCommand(services),
    new CommandGetCommand(services),
    new TypeGetAllCommand(services),
    new TypeGetCommand(services),
    new ListCreateCommand(services),
    new ListsGetCommand(services),
    new ItemCreateCommand(services),
    new ItemGetAllCommand(services),
    new ItemRemoveCommand(services),
    new ItemUpdateCommand(services),
    new ListClearCommand(services),
    new ListRemoveCommand(services),
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

export async function commandGetAll(): Promise<ToolResult> {
  return runCommand("commandGetAll", undefined);
}

export async function commandGet(input: CommandGetInput): Promise<ToolResult> {
  return runCommand("commandGet", input);
}

export async function typeGetAll(context?: ToolContext): Promise<ToolResult> {
  return runCommand("typeGetAll", undefined, context);
}

export async function typeGet(input: TypeGetInput, context?: ToolContext): Promise<ToolResult> {
  return runCommand("typeGet", input, context);
}

export async function listCreate(input: ListCreateInput, context?: ToolContext): Promise<ToolResult> {
  return runCommand("listCreate", input, context);
}

export async function listsGet(context?: ToolContext): Promise<ToolResult> {
  return runCommand("listsGet", undefined, context);
}

export async function itemCreate(input: ItemCreateInput, context?: ToolContext): Promise<ToolResult> {
  return runCommand("itemCreate", input, context);
}

export async function itemGetAll(input: ItemGetAllInput, context?: ToolContext): Promise<ToolResult> {
  return runCommand("itemGetAll", input, context);
}

export async function itemRemove(input: ItemRemoveInput, context?: ToolContext): Promise<ToolResult> {
  return runCommand("itemRemove", input, context);
}

export async function itemUpdate(input: ItemUpdateInput, context?: ToolContext): Promise<ToolResult> {
  return runCommand("itemUpdate", input, context);
}

export async function listClear(input: ListClearInput, context?: ToolContext): Promise<ToolResult> {
  return runCommand("listClear", input, context);
}

export async function listRemove(input: ListRemoveInput, context?: ToolContext): Promise<ToolResult> {
  return runCommand("listRemove", input, context);
}

export async function status(context?: ToolContext): Promise<ToolResult> {
  return runCommand("status", undefined, context);
}

export type {
  ToolContext,
  ToolResult
} from "./toolTypes.js";
