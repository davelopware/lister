import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

export async function withTempStore(run) {
  const dbPath = await mkdtemp(join(tmpdir(), "lister-integration-"));
  try {
    await run({ dbPath }, dbPath);
  } finally {
    await rm(dbPath, { recursive: true, force: true });
  }
}

export async function withTempWorkspace(run) {
  const workspaceDir = await mkdtemp(join(tmpdir(), "lister-workspace-"));
  try {
    await run(workspaceDir);
  } finally {
    await rm(workspaceDir, { recursive: true, force: true });
  }
}

export async function readListFile(dbPath, listName) {
  const raw = await readFile(join(dbPath, `${listName}.json`), "utf8");
  return JSON.parse(raw);
}

export async function writeListTypesConfig(dbPath, config) {
  const configDir = join(dbPath, "_config");
  await mkdir(configDir, { recursive: true });
  await writeFile(join(configDir, "custom-list-types.json"), `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

export async function writeRawListTypesConfig(dbPath, raw) {
  const configDir = join(dbPath, "_config");
  await mkdir(configDir, { recursive: true });
  await writeFile(join(configDir, "custom-list-types.json"), raw, "utf8");
}

export function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function collectProductionPackages(lock) {
  const packages = lock.packages ?? {};
  const root = packages[""] ?? {};
  const pending = Object.keys(root.dependencies ?? {});
  const seen = new Set();
  const resolved = [];

  while (pending.length > 0) {
    const name = pending.pop();
    if (!name || seen.has(name)) {
      continue;
    }
    seen.add(name);

    const pkg = packages[`node_modules/${name}`];
    if (!pkg) {
      continue;
    }

    resolved.push({ name, pkg });
    for (const depName of Object.keys(pkg.dependencies ?? {})) {
      if (!seen.has(depName)) {
        pending.push(depName);
      }
    }
  }

  return resolved.sort((left, right) => left.name.localeCompare(right.name));
}
