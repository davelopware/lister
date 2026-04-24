import test from "node:test";
import assert from "node:assert/strict";
import pluginEntry from "../../../dist/index.js";

test("default plugin entry: registers the lister tool", async () => {
  assert.equal(pluginEntry.id, "lister");
  assert.equal(pluginEntry.name, "Lister");
  assert.equal(typeof pluginEntry.register, "function");

  const registered = [];
  pluginEntry.register({
    registerTool(tool, opts) {
      registered.push({ tool, opts });
    }
  });

  assert.equal(registered.length, 1);
  assert.deepEqual(registered[0].opts, { names: ["lister"] });
  assert.equal(typeof registered[0].tool, "function");

  const runtimeTool = registered[0].tool({ workspaceDir: "/tmp/lister-workspace" });
  assert.equal(runtimeTool.name, "lister");
  assert.equal(runtimeTool.executionMode, "sequential");
  assert.equal(typeof runtimeTool.execute, "function");
});
