import type { ICommandRegistry } from "./interfaces/ICommandRegistry.js";
import type { IListerCommand } from "./interfaces/IListerCommand.js";
import { AddCommand } from "./AddCommand.js";
import { ClearCommand } from "./ClearCommand.js";
import { CommandArgsCommand } from "./CommandArgsCommand.js";
import { CommandRegistry } from "./CommandRegistry.js";
import { CreateCommand } from "./CreateCommand.js";
import { ItemsCommand } from "./ItemsCommand.js";
import { ListsCommand } from "./ListsCommand.js";
import { ListTypeSchemaCommand } from "./ListTypeSchemaCommand.js";
import { RemoveCommand } from "./RemoveCommand.js";
import { ShowCommandsCommand } from "./ShowCommandsCommand.js";
import { ShowListTypesCommand } from "./ShowListTypesCommand.js";
import { StatusCommand } from "./StatusCommand.js";
import { UpdateCommand } from "./UpdateCommand.js";

let defaultRegistry: ICommandRegistry | undefined;

export function createDefaultCommandRegistry(): ICommandRegistry {
  const registry = new CommandRegistry();
  const commands: readonly IListerCommand[] = [
    new ShowCommandsCommand(registry),
    new CommandArgsCommand(registry),
    new ShowListTypesCommand(),
    new ListTypeSchemaCommand(),
    new CreateCommand(),
    new ListsCommand(),
    new AddCommand(),
    new ItemsCommand(),
    new RemoveCommand(),
    new UpdateCommand(),
    new ClearCommand(),
    new StatusCommand()
  ];
  registry.setCommands(commands);
  return registry;
}

export function getDefaultCommandRegistry(): ICommandRegistry {
  if (!defaultRegistry) {
    defaultRegistry = createDefaultCommandRegistry();
  }
  return defaultRegistry;
}
