import type { CommandContext } from "../cli-types";
import { buildSite } from "../build";
import { loadConfig } from "../config/load-config";
import { readStringFlag } from "../utils/args";

function printBuildHelp(): void {
  console.log("Usage: good-docs build [--config <path>]");
  console.log("");
  console.log("Build static docs output.");
}

export async function runBuildCommand(context: CommandContext): Promise<number> {
  const configFlag = readStringFlag(context.flags, "config", "c");
  const loaded = await loadConfig({ cwd: context.cwd, configFile: configFlag });
  const result = await buildSite(loaded.config);

  const configSource =
    loaded.source === "file"
      ? loaded.config.configFilePath ?? "unknown"
      : "built-in defaults";

  const preview = result.graph.chapters.slice(0, 5);

  console.log("Build finished.");
  console.log(`- Config: ${configSource}`);
  console.log(`- Source dir: ${loaded.config.srcDirAbsolute}`);
  console.log(`- Output dir: ${result.outDirAbsolute}`);
  console.log(`- Generated pages: ${result.pageCount}`);
  console.log(`- Copied public assets: ${result.copiedPublicDir ? "yes" : "no"}`);

  if (preview.length > 0) {
    console.log("- Chapter preview:");
    for (const chapter of preview) {
      console.log(`  - ${chapter.title} -> ${chapter.sourcePath} (${chapter.routePath})`);
    }
  }

  return 0;
}

export { printBuildHelp };
