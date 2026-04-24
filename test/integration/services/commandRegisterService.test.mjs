import test from "node:test";
import assert from "node:assert/strict";
import { configureServices } from "../../../dist/tool.js";
import { Services } from "../../../dist/services/Services.js";

test("CommandRegisterService: exposes the configured command set and schema", async () => {
  const services = configureServices(new Services(), "/tmp/lister-command-register-test");
  const registry = services.getCommandRegisterService();
  const commands = registry.getCommands();

  assert.equal(commands.length, 12);
  assert.equal(registry.findCommand("create")?.name, "create");
  assert.equal(registry.findCommand("missing"), undefined);

  const schema = registry.buildSchema();
  assert.equal(schema.anyOf?.length, 12);
});
