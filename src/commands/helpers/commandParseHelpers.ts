import type { ICommandParseResult } from "../interfaces/ICommandParseResult.js";
import { parseFailure, parseSuccess } from "./commandParseResults.js";

export function asObjectRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

export function parseNoArgs(input: unknown): ICommandParseResult<Record<string, never>> {
  if (input === undefined) {
    return parseSuccess({});
  }
  const record = asObjectRecord(input);
  if (!record) {
    return parseFailure("params must be a JSON object");
  }
  if (Object.keys(record).length > 0) {
    return parseFailure("this command does not take arguments");
  }
  return parseSuccess({});
}

export function requireObject(input: unknown): ICommandParseResult<Record<string, unknown>> {
  const record = asObjectRecord(input);
  if (!record) {
    return parseFailure("params must be a JSON object");
  }
  return parseSuccess(record);
}

export function readRequiredString(record: Record<string, unknown>, fieldName: string): ICommandParseResult<string> {
  const value = record[fieldName];
  if (typeof value !== "string" || value.trim() === "") {
    return parseFailure(`${fieldName} is required`);
  }
  return parseSuccess(value);
}

export function readOptionalString(record: Record<string, unknown>, fieldName: string): ICommandParseResult<string | undefined> {
  const value = record[fieldName];
  if (value === undefined) {
    return parseSuccess(undefined);
  }
  if (typeof value !== "string") {
    return parseFailure(`${fieldName} must be a string`);
  }
  return parseSuccess(value);
}

export function readRequiredPositiveInt(record: Record<string, unknown>, fieldName: string): ICommandParseResult<number> {
  const value = record[fieldName];
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    return parseFailure(`${fieldName} must be a positive integer`);
  }
  return parseSuccess(value);
}

export function readOptionalPositiveInt(record: Record<string, unknown>, fieldName: string): ICommandParseResult<number | undefined> {
  const value = record[fieldName];
  if (value === undefined) {
    return parseSuccess(undefined);
  }
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    return parseFailure(`${fieldName} must be a positive integer when provided`);
  }
  return parseSuccess(value);
}

export function readRequiredObject(record: Record<string, unknown>, fieldName: string): ICommandParseResult<Record<string, unknown>> {
  const value = record[fieldName];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return parseFailure(`${fieldName} must be a JSON object`);
  }
  return parseSuccess(value as Record<string, unknown>);
}

export function readRequiredTrue(record: Record<string, unknown>, fieldName: string): ICommandParseResult<true> {
  if (record[fieldName] !== true) {
    return parseFailure(`${fieldName} must be true`);
  }
  return parseSuccess(true);
}
