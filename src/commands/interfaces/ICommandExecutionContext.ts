import type { IListerStore } from "../../store/IListerStore.js";
import type { ICommandRegistry } from "./ICommandRegistry.js";
import type { IListTypeRegisterService } from "../../services/IListTypeRegisterService.js";

export interface ICommandExecutionContext {
  dbPath: string;
  store: IListerStore;
  registry: ICommandRegistry;
  listTypeRegisterService: IListTypeRegisterService;
}
