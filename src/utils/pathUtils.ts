import { access } from "node:fs/promises";
import { resolve } from "node:path";
import type { ToolContext } from "../toolTypes.js";

export function resolveDbPath(context?: ToolContext): string {
  if (context?.dbPath && context.dbPath.trim() !== "") {
    return resolve(context.dbPath);
  }
  const fromEnv = process.env.LISTER_STORE_FOLDER;
  if (fromEnv && fromEnv.trim() !== "") {
    return resolve(fromEnv);
  }
  return resolve(process.cwd(), "lister-store");
}

export async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
