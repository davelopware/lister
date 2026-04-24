import test from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { createListerTool } from "../../../dist/pluginTool.js";
import { LISTER_PACKAGE_VERSION } from "../../../dist/index.js";
import { escapeRegex, readListFile, withTempWorkspace } from "../helpers/testHelpers.mjs";

test("lister tool: uses workspace-scoped storage and preflight validation", async () => {
  await withTempWorkspace(async (workspaceDir) => {
    const tool = createListerTool({ workspaceDir });

    const missingList = await tool.execute("call-1", { action: "listCreate" });
    assert.equal(missingList.details.ok, false);
    assert.equal(missingList.details.error, "list is required");

    const created = await tool.execute("call-2", {
      action: "listCreate",
      list: "tasks",
      listType: "todos",
      description: "Workspace scoped"
    });
    assert.equal(created.details.ok, true);

    const stored = await readListFile(join(workspaceDir, "lister-store"), "tasks");
    assert.equal(stored.description, "Workspace scoped");
    assert.equal(stored.list_type, "todos");
  });
});

test("lister tool: status output starts with store path and existence", async () => {
  await withTempWorkspace(async (workspaceDir) => {
    const tool = createListerTool({ workspaceDir });
    const result = await tool.execute("call-status", { action: "status" });
    const output = result.content[0]?.text ?? "";

    assert.match(
      output,
      new RegExp(`^Lister version: ${escapeRegex(LISTER_PACKAGE_VERSION)}\\nLister store: .+lister-store \\((exists|does not exist yet)\\)\\n\\{`)
    );
    assert.equal(result.details.ok, true);
    assert.equal(result.details.extension_version, LISTER_PACKAGE_VERSION);
    assert.equal(result.details.store_path, join(workspaceDir, "lister-store"));
    assert.equal(result.details.store_exists, false);
    assert.equal(result.details.custom_list_types_path, join(workspaceDir, "lister-store", "_config", "custom-list-types.json"));
    assert.equal(result.details.custom_list_types_exists, false);
  });
});
