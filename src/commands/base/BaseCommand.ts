import type { TSchema } from "@sinclair/typebox";
import type { ToolResult } from "../../toolTypes.js";
import type { IServices } from "../../services/interfaces/IServices.js";
import type { ICommandArgument } from "../interfaces/ICommandArgument.js";
import type { ICommandArgumentDefinition } from "../interfaces/ICommandArgumentDefinition.js";
import type { ICommandParseResult } from "../interfaces/ICommandParseResult.js";
import type { IListerCommand } from "../interfaces/IListerCommand.js";
import {
  parseNoArgs,
  readOptionalPositiveInt,
  readOptionalString,
  readRequiredObject,
  readRequiredPositiveInt,
  readRequiredString,
  readRequiredTrue,
  requireObject
} from "../helpers/commandParseHelpers.js";
import { parseFailure, parseSuccess } from "../helpers/commandParseResults.js";
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
  private readonly requiredDefinitions: readonly ICommandArgumentDefinition[];
  private readonly optionalDefinitions: readonly ICommandArgumentDefinition[];

  protected constructor(
    protected readonly services: IServices,
    definition: IBaseCommandDefinition
  ) {
    const requiredDefinitions = definition.requiredArgs ?? [];
    const optionalDefinitions = definition.optionalArgs ?? [];

    this.name = definition.name;
    this.description = definition.description;
    this.requiredDefinitions = requiredDefinitions;
    this.optionalDefinitions = optionalDefinitions;
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

  parse(input: unknown): ICommandParseResult<TParsed> {
    if (this.requiredDefinitions.length === 0 && this.optionalDefinitions.length === 0) {
      return parseNoArgs(input) as ICommandParseResult<TParsed>;
    }

    const params = requireObject(input);
    if (!params.ok) {
      return parseFailure(params.error ?? "params must be a JSON object");
    }

    const parsed: Record<string, unknown> = {};
    for (const definition of this.requiredDefinitions) {
      const result = this.readArgument(params.parsed!, definition, true);
      if (!result.ok) {
        return parseFailure(result.error ?? "Invalid command arguments");
      }
      parsed[definition.name] = result.parsed;
    }

    for (const definition of this.optionalDefinitions) {
      const result = this.readArgument(params.parsed!, definition, false);
      if (!result.ok) {
        return parseFailure(result.error ?? "Invalid command arguments");
      }
      if (result.parsed !== undefined) {
        parsed[definition.name] = result.parsed;
      }
    }

    return parseSuccess(parsed as TParsed);
  }

  private readArgument(
    params: Record<string, unknown>,
    definition: ICommandArgumentDefinition,
    required: boolean
  ): ICommandParseResult<unknown> {
    if (definition.parser === "true") {
      return required ? readRequiredTrue(params, definition.name) : parseFailure(`${definition.name} must be true`);
    }

    switch (definition.type) {
      case "string":
        return required ? readRequiredString(params, definition.name) : readOptionalString(params, definition.name);
      case "number":
        return required ? readRequiredPositiveInt(params, definition.name) : readOptionalPositiveInt(params, definition.name);
      case "object":
        if (!required && params[definition.name] === undefined) {
          return parseSuccess(undefined);
        }
        return readRequiredObject(params, definition.name);
      default:
        return parseFailure(`Unsupported parser for argument: ${definition.name}`);
    }
  }

  buildParseError(result: ICommandParseResult<TParsed>): ToolResult {
    return {
      ok: false,
      error: result.error ?? "Invalid command arguments"
    };
  }

  abstract execute(parsed: TParsed): Promise<ToolResult>;
}
