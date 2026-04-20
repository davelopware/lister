import { cp, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function copyFile(relativePath) {
  const source = resolve(rootDir, "src", relativePath);
  const destination = resolve(rootDir, "dist", relativePath);
  await mkdir(dirname(destination), { recursive: true });
  await cp(source, destination);
}

await copyFile("builtin-list-types.json");
