import type { UpdateInput } from "../../tool-types.js";
import type { IListerCommand } from "./IListerCommand.js";

export interface IUpdateCommand extends IListerCommand<UpdateInput> {}
