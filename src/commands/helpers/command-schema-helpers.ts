import { Type } from "@sinclair/typebox";

export function createActionSchema(action: string, properties: Record<string, unknown> = {}) {
  return Type.Object(
    {
      action: Type.Literal(action),
      ...properties
    },
    {
      additionalProperties: false
    }
  );
}
