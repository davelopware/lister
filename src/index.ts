/**
 * Public module entry for the Lister package.
 *
 * In OpenClaw terms, this is the plugin entry module that exports the default
 * registration object used by the host to expose the `lister` tool.
 *
 * Relative to the rest of the Lister entry-point files, this file sits at the
 * top: it re-exports the public API and types, while delegating actual tool
 * construction to `pluginTool.ts`.
 */
import { definePluginEntry, type OpenClawPluginApi } from "openclaw/plugin-sdk/plugin-entry";
import { createListerTool } from "./pluginTool.js";

export { ListerStoreService, getListNameValidationError } from "./services/ListerStoreService.js";
export type { IListerStoreService, ListFile, ListItem, ListReadResult } from "./services/interfaces/IListerStoreService.js";
export { CommandRegisterService } from "./services/CommandRegisterService.js";
export type { ICommandRegisterService } from "./services/interfaces/ICommandRegisterService.js";
export { ListTypeRegisterService } from "./services/ListTypeRegisterService.js";
export { Services } from "./services/Services.js";
export {
  DEFAULT_LIST_TYPE_NAME,
  type IListTypeRegisterService,
  type ListerListType,
  type ListTypeField,
  type ListTypeFieldType,
  type ListTypeInfo,
  type ListTypeRegistry
} from "./services/interfaces/IListTypeRegisterService.js";
export type { IServices } from "./services/interfaces/IServices.js";
export {
  commandGetAll,
  commandGet,
  typeGetAll,
  typeGet,
  listsGet,
  listCreate,
  listClear,
  listRemove,
  itemCreate,
  itemGetAll,
  itemUpdate,
  itemRemove,
  status,
  type ToolContext,
  type ToolResult,
} from "./tool.js";
export { LISTER_PACKAGE_VERSION } from "./version.js";

export default definePluginEntry({
  id: "lister",
  name: "Lister",
  description: "Structured local list management for OpenClaw workflows.",
  register(api: OpenClawPluginApi) {
    api.registerTool((ctx) => createListerTool(ctx), { names: ["lister"] });
  }
});
