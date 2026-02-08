import type { CommandContext } from "../cli-types";
import { buildSite } from "../build";
import type { BuildProgressEvent } from "../build";
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

function progressLabel(phase: BuildProgressEvent["phase"]): string {
  switch (phase) {
    case "clean":
      return "Cleaning output";
    case "assets":
      return "Bundling client assets";
    case "pages":
      return "Rendering pages";
    case "search-seo":
      return "Generating search + SEO";
  }
}

interface BuildProgressReporter {
  onProgress: (event: BuildProgressEvent) => void;
  complete: () => void;
}

function createBuildProgressReporter(): BuildProgressReporter {
  const isInteractive = Boolean(process.stdout.isTTY);
  let pagesLineActive = false;
  let lastPrintedPagePercent = 0;

  const endPagesLine = (): void => {
    if (!pagesLineActive) {
      return;
    }

    process.stdout.write("\n");
    pagesLineActive = false;
  };

  const writePageProgress = (current: number, total: number, force = false): void => {
    const progressLine = `  ${pc.dim(">")} ${pc.cyan(progressLabel("pages"))} ${pc.bold(
      `${current}/${total}`,
    )}`;

    if (isInteractive) {
      process.stdout.write(`\r${progressLine}`);
      pagesLineActive = true;
      return;
    }

    if (force || total === 0) {
      console.log(progressLine);
      return;
    }

    const percent = Math.floor((current / total) * 100);
    if (current === total || percent >= lastPrintedPagePercent + 10) {
      console.log(progressLine);
      lastPrintedPagePercent = percent;
    }
  };

  return {
    onProgress(event) {
      if (event.phase !== "pages") {
        if (event.status === "start") {
          endPagesLine();
          console.log(`  ${pc.dim(">")} ${pc.cyan(progressLabel(event.phase))} ${pc.dim("...")}`);
        }
        return;
      }

      if (event.status === "start") {
        endPagesLine();
        lastPrintedPagePercent = 0;
        writePageProgress(0, event.total ?? 0, true);
        return;
      }

      if (event.status === "progress") {
        writePageProgress(event.current ?? 0, event.total ?? 0);
        return;
      }

      if (event.status === "end") {
        endPagesLine();
      }
    },
    complete() {
      endPagesLine();
    },
  };
}

export async function runBuildCommand(context: CommandContext): Promise<number> {
  const configFlag = readStringFlag(context.flags, "config", "c");
  const loaded = await loadConfig({ cwd: context.cwd, configFile: configFlag });
  const progressReporter = createBuildProgressReporter();

  console.log(`${pc.bold(pc.green("docia"))} ${pc.bold("build")} ${pc.dim("running...")}`);

  const result = await (async () => {
    try {
      return await buildSite(loaded.config, {
        onProgress: progressReporter.onProgress,
      });
    } finally {
      progressReporter.complete();
    }
  })();

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
  console.log(`  ${key("Emitted files")}${pc.green(String(result.outputFiles.length))}`);
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

  return 0;
}

export { printBuildHelp };
