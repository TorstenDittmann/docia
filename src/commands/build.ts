import type { CommandContext } from "../cli-types";
import { buildSite } from "../build";
import { loadConfig } from "../config/load-config";
import { readStringFlag } from "../utils/args";
import pc from "picocolors";

function printBuildHelp(): void {
  console.log("Usage: docia build [--config <path>]");
  console.log("");
  console.log("Build static docs output.");
}

function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }

  return `${(ms / 1000).toFixed(2)}s`;
}

function padLabel(label: string): string {
  return `${label}:`.padEnd(17, " ");
}

function section(title: string): string {
  return pc.bold(pc.cyan(title));
}

function key(label: string): string {
  return pc.dim(padLabel(label));
}

function value(text: string): string {
  return pc.white(text);
}

export async function runBuildCommand(context: CommandContext): Promise<number> {
  const configFlag = readStringFlag(context.flags, "config", "c");
  const loaded = await loadConfig({ cwd: context.cwd, configFile: configFlag });
  const result = await buildSite(loaded.config);

  const configSource =
    loaded.source === "file"
      ? loaded.config.configFilePath ?? "unknown"
      : "built-in defaults";

  console.log(
    `${pc.bold(pc.green("docia"))} ${pc.bold("build")} ${pc.green("completed")} ${pc.dim("in")} ${pc.bold(
      formatDuration(result.timing.totalMs),
    )}`,
  );
  console.log("");
  console.log(section("Project"));
  console.log(`  ${key("Config")}${value(configSource)}`);
  console.log(`  ${key("Source")}${value(loaded.config.srcDirAbsolute)}`);
  console.log(`  ${key("Output")}${value(result.outDirAbsolute)}`);
  console.log("");
  console.log(section("Output"));
  console.log(`  ${key("Pages")}${pc.green(String(result.pageCount))}`);
  console.log(
    `  ${key("Markdown mirrors")}${pc.green(String(result.markdownMirrorCount))}`,
  );
  console.log(`  ${key("Search docs")}${pc.green(String(result.searchDocumentCount))}`);
  console.log(`  ${key("Client assets")}${pc.green(String(result.clientAssetCount))}`);
  console.log(
    `  ${key("Public assets")}${
      result.copiedPublicDir ? pc.green("copied") : pc.dim("none found")
    }`,
  );
  console.log(
    `  ${key("SEO files")}${
      result.emittedSeoFiles.length > 0
        ? pc.green(result.emittedSeoFiles.join(", "))
        : pc.dim("none")
    }`,
  );
  console.log("");
  console.log(section("Timing"));
  console.log(`  ${key("Clean")}${pc.yellow(formatDuration(result.timing.cleanMs))}`);
  console.log(
    `  ${key("Client bundle")}${pc.yellow(formatDuration(result.timing.assetsMs))}`,
  );
  console.log(
    `  ${key("Page render")}${pc.yellow(formatDuration(result.timing.pagesMs))}`,
  );
  console.log(
    `  ${key("Search + SEO")}${pc.yellow(formatDuration(result.timing.searchAndSeoMs))}`,
  );

  console.log("");
  console.log(section("Files"));
  result.outputFiles.forEach((filePath) => {
    console.log(`  ${pc.dim("•")} ${pc.blue(filePath)}`);
  });

  return 0;
}

export { printBuildHelp };
