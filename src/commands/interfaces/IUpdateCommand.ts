import type { UpdateInput } from "../../toolTypes.js";
import type { IListerCommand } from "./IListerCommand.js";

export interface IUpdateCommand extends IListerCommand<UpdateInput> {}
