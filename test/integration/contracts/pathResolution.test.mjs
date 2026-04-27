import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import * as lister from "../../../dist/tool.js";
import { LISTER_PACKAGE_VERSION } from "../../../dist/index.js";
import { readListFile } from "../helpers/testHelpers.mjs";

test("storage: LISTER_STORE_FOLDER overrides default storage folder", async () => {
  const storePath = await mkdtemp(join(tmpdir(), "lister-env-store-"));
  const oldValue = process.env.LISTER_STORE_FOLDER;
  process.env.LISTER_STORE_FOLDER = storePath;

  try {
    await lister.listCreate({ list: "env-list", listType: "general", description: "Track env-backed notes" });
    await lister.itemCreate({ list: "env-list", data: { text: "from-env" } });

    const parsed = await readListFile(storePath, "env-list");
    assert.equal(parsed.version, LISTER_PACKAGE_VERSION);
    assert.equal(parsed.list_type, "general");
    assert.deepEqual(parsed.items.map((item) => item.data.text), ["from-env"]);
  } finally {
    if (oldValue === undefined) {
      delete process.env.LISTER_STORE_FOLDER;
    } else {
      process.env.LISTER_STORE_FOLDER = oldValue;
    }
    await rm(storePath, { recursive: true, force: true });
  }
});
