import type { IListerCommand } from "./IListerCommand.js";

export interface IStatusCommand extends IListerCommand<Record<string, never>> {}
