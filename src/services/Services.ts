import type { ICommandRegisterService } from "./interfaces/ICommandRegisterService.js";
import type { IListerStoreService } from "./interfaces/IListerStoreService.js";
import type { IListTypeRegisterService } from "./interfaces/IListTypeRegisterService.js";
import type { IServices } from "./interfaces/IServices.js";

export class Services implements IServices {
  private commandRegisterService: ICommandRegisterService | undefined;
  private listTypeRegisterService: IListTypeRegisterService | undefined;
  private listerStoreService: IListerStoreService | undefined;

  setCommandRegisterService(commandRegisterService: ICommandRegisterService): void {
    this.commandRegisterService = commandRegisterService;
  }

  setListTypeRegisterService(listTypeRegisterService: IListTypeRegisterService): void {
    this.listTypeRegisterService = listTypeRegisterService;
  }

  setListerStoreService(listerStoreService: IListerStoreService): void {
    this.listerStoreService = listerStoreService;
  }

  getCommandRegisterService(): ICommandRegisterService {
    if (!this.commandRegisterService) {
      throw new Error("CommandRegisterService has not been set on Services");
    }
    return this.commandRegisterService;
  }

  getListTypeRegisterService(): IListTypeRegisterService {
    if (!this.listTypeRegisterService) {
      throw new Error("ListTypeRegisterService has not been set on Services");
    }
    return this.listTypeRegisterService;
  }

  getListerStoreService(): IListerStoreService {
    if (!this.listerStoreService) {
      throw new Error("ListerStoreService has not been set on Services");
    }
    return this.listerStoreService;
  }
}
