import type { TSchema } from "@sinclair/typebox";
import type { ToolResult } from "../../toolTypes.js";
import type { IServices } from "../../services/interfaces/IServices.js";
import type { ICommandArgument } from "../interfaces/ICommandArgument.js";
import type { ICommandArgumentDefinition } from "../interfaces/ICommandArgumentDefinition.js";
import type { ICommandParseResult } from "../interfaces/ICommandParseResult.js";
import type { IListerCommand } from "../interfaces/IListerCommand.js";
import { createActionSchema, splitCommandArgs } from "../helpers/commandSchemaHelpers.js";

interface IBaseCommandDefinition {
  readonly name: string;
  readonly description: string;
  readonly requiredArgs?: readonly ICommandArgumentDefinition[];
  readonly optionalArgs?: readonly ICommandArgumentDefinition[];
}

export abstract class BaseCommand<TParsed> implements IListerCommand<TParsed> {
  readonly name: string;
  readonly description: string;
  readonly requiredArgs: readonly ICommandArgument[];
  readonly optionalArgs: readonly ICommandArgument[];
  private readonly schema: TSchema;

  protected constructor(
    protected readonly services: IServices,
    definition: IBaseCommandDefinition
  ) {
    const requiredDefinitions = definition.requiredArgs ?? [];
    const optionalDefinitions = definition.optionalArgs ?? [];

    this.name = definition.name;
    this.description = definition.description;
    const parsedArgs = splitCommandArgs(requiredDefinitions, optionalDefinitions);
    this.requiredArgs = parsedArgs.requiredArgs;
    this.optionalArgs = parsedArgs.optionalArgs;
    this.schema = createActionSchema(this.name, requiredDefinitions, optionalDefinitions);
  }

  canHandle(commandName: string): boolean {
    return commandName === this.name;
  }

  getSchema(): TSchema {
    return this.schema;
  }

  abstract parse(input: unknown): ICommandParseResult<TParsed>;

  buildParseError(result: ICommandParseResult<TParsed>): ToolResult {
    return {
      ok: false,
      error: result.error ?? "Invalid command arguments"
    };
  }

  abstract execute(parsed: TParsed): Promise<ToolResult>;
}
