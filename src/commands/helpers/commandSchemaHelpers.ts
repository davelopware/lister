import { Type, type TProperties, type TSchema } from "@sinclair/typebox";
import type { ICommandArgument } from "../interfaces/ICommandArgument.js";
import type { ICommandArgumentDefinition } from "../interfaces/ICommandArgumentDefinition.js";

export function commandArg(
  name: string,
  type: string,
  description: string,
  schema: (description: string) => TSchema
): ICommandArgumentDefinition {
  return {
    name,
    type,
    description,
    schema
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

export function createActionSchema(
  action: string,
  requiredDefinitions: readonly ICommandArgumentDefinition[] = [],
  optionalDefinitions: readonly ICommandArgumentDefinition[] = []
) {
  const properties: TProperties = {
    action: Type.Literal(action)
  };

  for (const definition of requiredDefinitions) {
    properties[definition.name] = definition.schema(definition.description);
  }

  for (const definition of optionalDefinitions) {
    properties[definition.name] = Type.Optional(definition.schema(definition.description));
  }

  return Type.Object(properties, {
    additionalProperties: false
  });
}
