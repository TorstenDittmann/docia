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
		usage: "docia init [directory] [--title <name>] [--force]",
		run: runInitCommand,
	},
	{
		name: "build",
		description: "Build static docs output",
		usage: "docia build [--config <path>]",
		run: runBuildCommand,
	},
	{
		name: "dev",
		description: "Start docs in development mode",
		usage: "docia dev [--config <path>] [--port <number>] [--host <host>]",
		run: runDevCommand,
	},
	{
		name: "serve",
		description: "Serve built static output",
		usage: "docia serve [--config <path>] [--port <number>] [--host <host>] [--build]",
		run: runServeCommand,
	},
	{
		name: "check",
		description: "Validate docs graph and links",
		usage: "docia check [--config <path>]",
		run: runCheckCommand,
	},
	{
		name: "new",
		description: "Create a new chapter file",
		usage: "docia new <chapter-name> [--title <name>] [--force]",
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
