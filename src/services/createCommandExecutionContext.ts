import { ListerStore } from "../store/ListerStore.js";
import type { ToolContext } from "../tool-types.js";
import type { ICommandExecutionContext } from "../commands/interfaces/ICommandExecutionContext.js";
import type { ICommandRegistry } from "../commands/interfaces/ICommandRegistry.js";
import type { IListerStore } from "../store/IListerStore.js";
import type { IListTypeRegisterService } from "./IListTypeRegisterService.js";
import { ListTypeRegisterService } from "./ListTypeRegisterService.js";
import { resolveDbPath } from "./path-utils.js";

export function createCommandExecutionContext(registry: ICommandRegistry, context?: ToolContext): ICommandExecutionContext {
  const dbPath = resolveDbPath(context);
  const listTypeRegisterService: IListTypeRegisterService = new ListTypeRegisterService(dbPath);
  const store: IListerStore = new ListerStore(dbPath, listTypeRegisterService);
  return {
    dbPath,
    store,
    registry,
    listTypeRegisterService
  };
}
