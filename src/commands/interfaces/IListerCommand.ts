import type { TSchema } from "@sinclair/typebox";
import type { ToolResult } from "../../tool-types.js";
import type { ICommandArgument } from "./ICommandArgument.js";
import type { ICommandExecutionContext } from "./ICommandExecutionContext.js";
import type { ICommandParseResult } from "./ICommandParseResult.js";

export interface IListerCommand<TParsed = unknown> {
  readonly name: string;
  readonly description: string;
  readonly requiredArgs: readonly ICommandArgument[];
  readonly optionalArgs: readonly ICommandArgument[];
  canHandle(commandName: string): boolean;
  getSchema(): TSchema;
  parse(input: unknown): ICommandParseResult<TParsed>;
  buildParseError(result: ICommandParseResult<TParsed>): ToolResult;
  execute(parsed: TParsed, context: ICommandExecutionContext): Promise<ToolResult>;
}
