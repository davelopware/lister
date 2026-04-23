import type { TSchema } from "@sinclair/typebox";
import type { ToolResult } from "../../tool-types.js";
import type { IServices } from "../../services/interfaces/IServices.js";
import type { ICommandArgument } from "../interfaces/ICommandArgument.js";
import type { ICommandParseResult } from "../interfaces/ICommandParseResult.js";
import type { IListerCommand } from "../interfaces/IListerCommand.js";

export abstract class BaseCommand<TParsed> implements IListerCommand<TParsed> {
  readonly requiredArgs: readonly ICommandArgument[];
  readonly optionalArgs: readonly ICommandArgument[];

  protected constructor(
    protected readonly services: IServices,
    public readonly name: string,
    public readonly description: string,
    requiredArgs: readonly ICommandArgument[] = [],
    optionalArgs: readonly ICommandArgument[] = []
  ) {
    this.requiredArgs = requiredArgs;
    this.optionalArgs = optionalArgs;
  }

  canHandle(commandName: string): boolean {
    return commandName === this.name;
  }

  abstract getSchema(): TSchema;

  abstract parse(input: unknown): ICommandParseResult<TParsed>;

  buildParseError(result: ICommandParseResult<TParsed>): ToolResult {
    return {
      ok: false,
      error: result.error ?? "Invalid command arguments"
    };
  }

  abstract execute(parsed: TParsed): Promise<ToolResult>;
}
