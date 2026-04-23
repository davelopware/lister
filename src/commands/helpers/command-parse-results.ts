import type { ICommandParseResult } from "../interfaces/ICommandParseResult.js";

export function parseSuccess<TParsed>(parsed: TParsed): ICommandParseResult<TParsed> {
  return { ok: true, parsed };
}

export function parseFailure<TParsed>(error: string): ICommandParseResult<TParsed> {
  return { ok: false, error };
}
