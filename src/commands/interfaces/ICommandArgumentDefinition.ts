import type { TSchema } from "@sinclair/typebox";
import type { ICommandArgument } from "./ICommandArgument.js";

export type TCommandArgumentParser = "default" | "true";

export interface ICommandArgumentDefinition extends ICommandArgument {
  readonly schema: (description: string) => TSchema;
  readonly parser?: TCommandArgumentParser;
}
