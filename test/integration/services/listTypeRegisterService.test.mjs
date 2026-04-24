import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { ListTypeRegisterService } from "../../../dist/services/ListTypeRegisterService.js";
import { writeListTypesConfig, writeRawListTypesConfig } from "../helpers/testHelpers.mjs";

async function withDbPath(run) {
  const dbPath = await mkdtemp(join(tmpdir(), "lister-list-types-"));
  try {
    await run(dbPath);
  } finally {
    await rm(dbPath, { recursive: true, force: true });
  }
}

test("ListTypeRegisterService: merges custom list types into the registry", async () => {
  await withDbPath(async (dbPath) => {
    await writeListTypesConfig(dbPath, {
      types: [
        {
          name: "vendors",
          purpose: "Track suppliers and commercial contacts.",
          fields: [
            { name: "name", type: "string", description: "Vendor name" },
            { name: "owner", type: "string", description: "Internal owner" },
            { name: "renewal_date", type: "datetime", description: "Renewal date" }
          ]
        }
      ]
    });

    const service = new ListTypeRegisterService(dbPath);
    assert.equal(service.isListType("vendors"), true);
    assert.equal(service.listTypeNames().includes("vendors"), true);
    assert.deepEqual(service.getListTypeInfo("vendors")?.fields.map((field) => field.name), [
      "name",
      "owner",
      "renewal_date"
    ]);
  });
});

test("ListTypeRegisterService: duplicate names fail fast", async () => {
  await withDbPath(async (dbPath) => {
    await writeListTypesConfig(dbPath, {
      types: [
        {
          name: "todos",
          purpose: "Duplicate built-in",
          fields: [{ name: "text", type: "string", description: "Text" }]
        }
      ]
    });

    assert.throws(() => new ListTypeRegisterService(dbPath), /Duplicate list type "todos"/);
  });
});

test("ListTypeRegisterService: malformed config fails clearly", async () => {
  await withDbPath(async (dbPath) => {
    await writeRawListTypesConfig(dbPath, "{\n  \"types\": [\n");
    assert.throws(() => new ListTypeRegisterService(dbPath), /Invalid list type config at .*custom-list-types\.json:/);
  });
});
