#!/usr/bin/env bun

import type { CommandDefinition } from "./cli-types";
import { getCommand, getCommands } from "./commands";
import { CliError } from "./errors";
import { parseCliInput, readBooleanFlag } from "./utils/args";

const CLI_NAME = "good-docs";

async function getVersion(): Promise<string> {
  const packageJsonFile = Bun.file(new URL("../package.json", import.meta.url));
  if (!(await packageJsonFile.exists())) {
    return "0.0.0";
  }

  const packageJson = (await packageJsonFile.json()) as {
    version?: unknown;
  };

  return typeof packageJson.version === "string" ? packageJson.version : "0.0.0";
}

function printGeneralHelp(commands: readonly CommandDefinition[]): void {
  console.log(`Usage: ${CLI_NAME} <command> [options]`);
  console.log("");
  console.log("Commands:");

  for (const command of commands) {
    const padding = " ".repeat(Math.max(1, 9 - command.name.length));
    console.log(`  ${command.name}${padding}${command.description}`);
  }

  console.log("");
  console.log(`Run \`${CLI_NAME} help <command>\` for command usage.`);
}

function printCommandHelp(command: CommandDefinition): void {
  console.log(`Usage: ${command.usage}`);
  console.log("");
  console.log(command.description);
}

async function run(): Promise<number> {
  const parsed = parseCliInput(Bun.argv.slice(2));
  const commands = getCommands();

  if (readBooleanFlag(parsed.flags, "version", "v")) {
    console.log(await getVersion());
    return 0;
  }

  if (parsed.command === null) {
    printGeneralHelp(commands);
    return 0;
  }

  if (parsed.command === "help") {
    const target = parsed.positionals[0];
    if (target === undefined) {
      printGeneralHelp(commands);
      return 0;
    }

    const targetCommand = getCommand(target);
    if (targetCommand === undefined) {
      throw new CliError(`Unknown command: ${target}`);
    }

    printCommandHelp(targetCommand);
    return 0;
  }

  const command = getCommand(parsed.command);
  if (command === undefined) {
    throw new CliError(`Unknown command: ${parsed.command}`);
  }

  if (readBooleanFlag(parsed.flags, "help", "h")) {
    printCommandHelp(command);
    return 0;
  }

  return command.run({
    cwd: process.cwd(),
    command: command.name,
    rawArgs: parsed.rawArgs,
    positionals: parsed.positionals,
    flags: parsed.flags,
  });
}

run()
  .then((exitCode) => {
    process.exit(exitCode);
  })
  .catch((error: unknown) => {
    if (error instanceof CliError) {
      console.error(error.message);
      process.exit(error.exitCode);
      return;
    }

    if (error instanceof Error) {
      console.error(error.message);
      process.exit(1);
      return;
    }

    console.error(String(error));
    process.exit(1);
  });
