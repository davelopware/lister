import { Type, type TProperties, type TSchema } from "@sinclair/typebox";
import type { ICommandArgument } from "../interfaces/ICommandArgument.js";
import type { ICommandArgumentDefinition, TCommandArgumentParser } from "../interfaces/ICommandArgumentDefinition.js";

export function commandArg(
  name: string,
  type: string,
  description: string,
  schema: (description: string) => TSchema,
  parser: TCommandArgumentParser = "default"
): ICommandArgumentDefinition {
  return {
    name,
    type,
    description,
    schema,
    parser
  };
}

export function splitCommandArgs(
  requiredDefinitions: readonly ICommandArgumentDefinition[],
  optionalDefinitions: readonly ICommandArgumentDefinition[]
): { requiredArgs: readonly ICommandArgument[]; optionalArgs: readonly ICommandArgument[] } {
  const toCommandArg = (definition: ICommandArgumentDefinition): ICommandArgument => ({
    name: definition.name,
    type: definition.type,
    description: definition.description
  });

  return {
    requiredArgs: requiredDefinitions.map(toCommandArg),
    optionalArgs: optionalDefinitions.map(toCommandArg)
  };
}

function createCommandProperties(
  requiredDefinitions: readonly ICommandArgumentDefinition[] = [],
  optionalDefinitions: readonly ICommandArgumentDefinition[] = []
): TProperties {
  const properties: TProperties = {};

  for (const definition of requiredDefinitions) {
    properties[definition.name] = definition.schema(definition.description);
  }

  for (const definition of optionalDefinitions) {
    properties[definition.name] = Type.Optional(definition.schema(definition.description));
  }

  return properties;
}

export function createActionSchema(
  action: string,
  requiredDefinitions: readonly ICommandArgumentDefinition[] = [],
  optionalDefinitions: readonly ICommandArgumentDefinition[] = []
) {
  return Type.Object(
    {
      action: Type.Literal(action),
      ...createCommandProperties(requiredDefinitions, optionalDefinitions)
    },
    {
      additionalProperties: false
    }
  );
}
