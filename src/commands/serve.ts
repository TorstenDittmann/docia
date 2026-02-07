import type { CommandContext } from "../cli-types";
import { buildSite } from "../build";
import { loadConfig } from "../config/load-config";
import { CliError } from "../errors";
import { serveStaticRequest } from "../server/static";
import { readBooleanFlag, readNumberFlag, readStringFlag } from "../utils/args";
import { waitForTermination } from "../utils/process";

function printServeHelp(): void {
  console.log(
    "Usage: docia serve [--config <path>] [--port <number>] [--host <host>] [--build]",
  );
  console.log("");
  console.log("Serve built static docs output.");
}

export async function runServeCommand(context: CommandContext): Promise<number> {
  const configFlag = readStringFlag(context.flags, "config", "c");
  const port = readNumberFlag(context.flags, "port", "p") ?? 4000;
  const host = readStringFlag(context.flags, "host") ?? "127.0.0.1";
  const shouldBuild = readBooleanFlag(context.flags, "build", "b");

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new CliError(`Invalid port: ${port}. Expected a value between 1 and 65535.`);
  }

  const loaded = await loadConfig({ cwd: context.cwd, configFile: configFlag });

  if (shouldBuild) {
    await buildSite(loaded.config);
  }

  const indexExists = await Bun.file(
    `${loaded.config.outDirAbsolute}/index.html`,
  ).exists();
  if (!indexExists) {
    throw new CliError(
      `No build output found in \`${loaded.config.outDirAbsolute}\`. Run \`docia build\` first or pass \`--build\`.`,
    );
  }

  const server = Bun.serve({
    port,
    hostname: host,
    fetch: async (request) =>
      serveStaticRequest({
        config: loaded.config,
        request,
      }),
  });

  const baseUrl = new URL(server.url);
  const basePath = loaded.config.basePath === "/" ? "/" : `${loaded.config.basePath}/`;
  const docsUrl = new URL(basePath, baseUrl).toString();

  console.log("Serving static docs.");
  console.log(`- Config: ${loaded.config.configFilePath ?? "built-in defaults"}`);
  console.log(`- Static output dir: ${loaded.config.outDirAbsolute}`);
  console.log(`- URL: ${docsUrl}`);
  console.log("- Press Ctrl+C to stop.");

  await waitForTermination(() => {
    server.stop(true);
  });

  return 0;
}

export { printServeHelp };
