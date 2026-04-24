import test from "node:test";
import assert from "node:assert/strict";
import { Services } from "../../../dist/services/Services.js";
import { CommandRegisterService } from "../../../dist/services/CommandRegisterService.js";
import { ListTypeRegisterService } from "../../../dist/services/ListTypeRegisterService.js";
import { ListerStoreService } from "../../../dist/services/ListerStoreService.js";

test("Services: throws until dependencies are set and returns them after wiring", async () => {
  const services = new Services();

  assert.throws(() => services.getCommandRegisterService(), /CommandRegisterService has not been set/);
  assert.throws(() => services.getListTypeRegisterService(), /ListTypeRegisterService has not been set/);
  assert.throws(() => services.getListerStoreService(), /ListerStoreService has not been set/);

  const listTypeRegisterService = new ListTypeRegisterService("/tmp/lister-services-test");
  const listerStoreService = new ListerStoreService("/tmp/lister-services-test", listTypeRegisterService);
  const commandRegisterService = new CommandRegisterService(services);

  services.setListTypeRegisterService(listTypeRegisterService);
  services.setListerStoreService(listerStoreService);
  services.setCommandRegisterService(commandRegisterService);

  assert.equal(services.getListTypeRegisterService(), listTypeRegisterService);
  assert.equal(services.getListerStoreService(), listerStoreService);
  assert.equal(services.getCommandRegisterService(), commandRegisterService);
});
