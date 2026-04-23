export interface ICommandParseResult<TParsed = unknown> {
  ok: boolean;
  parsed?: TParsed | undefined;
  error?: string | undefined;
}
