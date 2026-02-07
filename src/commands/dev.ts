import type { CommandContext } from "../cli-types";
import { startDevServer } from "../dev";
import { CliError } from "../errors";
import { readNumberFlag, readStringFlag } from "../utils/args";

function printDevHelp(): void {
  console.log(
    "Usage: docia dev [--config <path>] [--port <number>] [--host <host>]",
  );
  console.log("");
  console.log("Build and serve docs with file-watch rebuilds.");
}

export async function runDevCommand(context: CommandContext): Promise<number> {
  const configFlag = readStringFlag(context.flags, "config", "c");
  const port = readNumberFlag(context.flags, "port", "p") ?? 3000;
  const host = readStringFlag(context.flags, "host") ?? "127.0.0.1";

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new CliError(`Invalid port: ${port}. Expected a value between 1 and 65535.`);
  }

  await startDevServer({
    cwd: context.cwd,
    configFile: configFlag,
    host,
    port,
  });

  return 0;
}

export { printDevHelp };
