import { definePluginEntry, type OpenClawPluginApi } from "openclaw/plugin-sdk/plugin-entry";
import { createListerTool } from "./plugin-tool.js";

export { ListerStore, type ListItem } from "./store.js";
export {
  DEFAULT_LIST_TYPE_NAME,
  getListTypeInfo,
  getListTypesConfigPath,
  isListType,
  listTypeInfos,
  listTypeNames,
  loadListTypeRegistry,
  parseItemForListType,
  startupChecks,
  type ListerListType,
  type ListTypeField,
  type ListTypeInfo
} from "./list-types.js";
export {
  add,
  clear,
  commandArgs,
  create,
  items,
  listTypes,
  listTypeSchema,
  lists,
  remove,
  showCommands,
  showListTypes,
  status,
  update,
  type AddInput,
  type CommandArgsInput,
  type ClearInput,
  type CreateInput,
  type ItemRefInput,
  type ItemsInput,
  type ListTypeSchemaInput,
  type ToolContext,
  type ToolResult,
  type UpdateInput
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
