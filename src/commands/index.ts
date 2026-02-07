import type { CommandDefinition } from "../cli-types";
import { runBuildCommand } from "./build";
import { runCheckCommand } from "./check";
import { runDevCommand } from "./dev";
import { runInitCommand } from "./init";
import { runNewCommand } from "./new";
import { runServeCommand } from "./serve";

const commandList: CommandDefinition[] = [
  {
    name: "init",
    description: "Create a new docs scaffold",
    usage: "good-docs init [directory] [--title <name>] [--force]",
    run: runInitCommand,
  },
  {
    name: "build",
    description: "Build static docs output",
    usage: "good-docs build [--config <path>]",
    run: runBuildCommand,
  },
  {
    name: "dev",
    description: "Start docs in development mode",
    usage: "good-docs dev [--config <path>] [--port <number>] [--host <host>]",
    run: runDevCommand,
  },
  {
    name: "serve",
    description: "Serve built static output",
    usage:
      "good-docs serve [--config <path>] [--port <number>] [--host <host>] [--build]",
    run: runServeCommand,
  },
  {
    name: "check",
    description: "Validate docs graph and links",
    usage: "good-docs check [--config <path>]",
    run: runCheckCommand,
  },
  {
    name: "new",
    description: "Create a new chapter file",
    usage: "good-docs new <chapter-name> [--title <name>] [--force]",
    run: runNewCommand,
  },
];

const commandMap = new Map<string, CommandDefinition>(
  commandList.map((command) => [command.name, command]),
);

export function getCommand(name: string): CommandDefinition | undefined {
  return commandMap.get(name);
}

export function getCommands(): CommandDefinition[] {
  return commandList;
}
