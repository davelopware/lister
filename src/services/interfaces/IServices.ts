import type { ICommandRegisterService } from "./ICommandRegisterService.js";
import type { IListerStoreService } from "./IListerStoreService.js";
import type { IListTypeRegisterService } from "./IListTypeRegisterService.js";

export interface IServices {
  setCommandRegisterService(commandRegisterService: ICommandRegisterService): void;
  setListTypeRegisterService(listTypeRegisterService: IListTypeRegisterService): void;
  setListerStoreService(listerStoreService: IListerStoreService): void;
  getCommandRegisterService(): ICommandRegisterService;
  getListTypeRegisterService(): IListTypeRegisterService;
  getListerStoreService(): IListerStoreService;
}
