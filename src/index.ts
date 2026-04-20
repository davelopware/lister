import { definePluginEntry, type OpenClawPluginApi } from "openclaw/plugin-sdk/plugin-entry";
import { createListerTool } from "./plugin-tool.js";

export { ListerStore, type ListItem } from "./store.js";
export { listTypeInfos, parseItemForListType, type ListerListType, type ListTypeField, type ListTypeInfo } from "./list-types.js";
export {
  add,
  clear,
  create,
  items,
  listTypes,
  lists,
  remove,
  status,
  update,
  type AddInput,
  type ClearInput,
  type CreateInput,
  type ItemRefInput,
  type ItemsInput,
  type ToolContext,
  type ToolResult,
  type UpdateInput
} from "./tool.js";

export default definePluginEntry({
  id: "lister",
  name: "Lister",
  description: "Structured local list management for OpenClaw workflows.",
  register(api: OpenClawPluginApi) {
    api.registerTool((ctx) => createListerTool(ctx), { names: ["lister"] });
  }
});
