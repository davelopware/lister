import type { TSchema } from "@sinclair/typebox";
import type { ICommandArgument } from "./ICommandArgument.js";

export interface ICommandArgumentDefinition extends ICommandArgument {
  readonly schema: (description: string) => TSchema;
}
