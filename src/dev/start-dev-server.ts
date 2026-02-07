import { stat } from "node:fs/promises";
import { watch, type FSWatcher } from "node:fs";
import { relative } from "node:path";
import { buildSite } from "../build";
import { loadConfig } from "../config/load-config";
import type { ResolvedConfig } from "../config/types";
import { CliError } from "../errors";
import { serveStaticRequest } from "../server/static";
import { waitForTermination } from "../utils/process";

interface DevServerOptions {
  cwd: string;
  configFile?: string;
  host: string;
  port: number;
}

type LogLevel = "info" | "error";

function log(level: LogLevel, message: string): void {
  const prefix = level === "error" ? "[dev:error]" : "[dev]";
  if (level === "error") {
    console.error(`${prefix} ${message}`);
  } else {
    console.log(`${prefix} ${message}`);
  }
}

async function getPathKind(pathValue: string): Promise<"file" | "directory" | null> {
  try {
    const pathStat = await stat(pathValue);
    if (pathStat.isDirectory()) {
      return "directory";
    }

    if (pathStat.isFile()) {
      return "file";
    }

    return null;
  } catch {
    return null;
  }
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function resolveDocsUrl(config: ResolvedConfig, serverUrl: URL): string {
  const basePath = config.basePath === "/" ? "/" : `${config.basePath}/`;
  return new URL(basePath, serverUrl).toString();
}

export async function startDevServer(options: DevServerOptions): Promise<void> {
  if (!Number.isInteger(options.port) || options.port < 1 || options.port > 65535) {
    throw new CliError(
      `Invalid port: ${options.port}. Expected a value between 1 and 65535.`,
    );
  }

  let loadedConfig = await loadConfig({
    cwd: options.cwd,
    configFile: options.configFile,
    reload: true,
  });
  let activeConfig = loadedConfig.config;
  const initialBuild = await buildSite(activeConfig, {
    minifyAssets: false,
    sourcemapAssets: "linked",
  });

  const watchers: FSWatcher[] = [];

  let isBuilding = false;
  let pendingReason: string | null = null;
  let rebuildTimer: ReturnType<typeof setTimeout> | null = null;

  const server = Bun.serve({
    port: options.port,
    hostname: options.host,
    fetch: async (request) =>
      serveStaticRequest({
        config: activeConfig,
        request,
        noCache: true,
      }),
  });

  const clearWatchers = (): void => {
    for (const watcher of watchers) {
      watcher.close();
    }
    watchers.length = 0;
  };

  const watchPath = async (pathValue: string, recursive: boolean): Promise<void> => {
    const kind = await getPathKind(pathValue);
    if (kind === null) {
      return;
    }

    if (recursive && kind !== "directory") {
      return;
    }

    const watcher = watch(
      pathValue,
      { recursive },
      (eventType, filename) => {
        const fileLabel = typeof filename === "string" ? filename : "unknown";
        queueRebuild(`${eventType}:${fileLabel}`);
      },
    );

    watcher.on("error", (error) => {
      log("error", `Watcher error on ${pathValue}: ${formatError(error)}`);
    });

    watchers.push(watcher);
  };

  const refreshWatchers = async (config: ResolvedConfig): Promise<void> => {
    clearWatchers();

    await watchPath(config.srcDirAbsolute, true);
    await watchPath(config.publicDirAbsolute, true);

    if (config.configFilePath) {
      await watchPath(config.configFilePath, false);
    }
  };

  const runRebuild = async (reason: string): Promise<void> => {
    if (isBuilding) {
      pendingReason = reason;
      return;
    }

    isBuilding = true;

    try {
      loadedConfig = await loadConfig({
        cwd: options.cwd,
        configFile: options.configFile,
        reload: true,
      });

      activeConfig = loadedConfig.config;
      const result = await buildSite(activeConfig, {
        minifyAssets: false,
        sourcemapAssets: "linked",
      });
      await refreshWatchers(activeConfig);

      const changedFrom = reason.trim().length > 0 ? reason : "file change";
      log(
        "info",
        `Rebuilt ${result.pageCount} pages (${changedFrom}) -> ${relative(
          options.cwd,
          result.outDirAbsolute,
        ) || "."}`,
      );
    } catch (error) {
      log("error", `Rebuild failed: ${formatError(error)}`);
    } finally {
      isBuilding = false;

      if (pendingReason !== null) {
        const nextReason = pendingReason;
        pendingReason = null;
        void runRebuild(nextReason);
      }
    }
  };

  const queueRebuild = (reason: string): void => {
    if (rebuildTimer !== null) {
      clearTimeout(rebuildTimer);
    }

    rebuildTimer = setTimeout(() => {
      rebuildTimer = null;
      void runRebuild(reason);
    }, 120);
  };

  await refreshWatchers(activeConfig);

  const serverUrl = new URL(server.url);
  const docsUrl = resolveDocsUrl(activeConfig, serverUrl);

  log("info", `Config: ${loadedConfig.config.configFilePath ?? "built-in defaults"}`);
  log("info", `Source dir: ${activeConfig.srcDirAbsolute}`);
  log("info", `Output dir: ${activeConfig.outDirAbsolute}`);
  log("info", `Built ${initialBuild.pageCount} pages.`);
  log("info", `Listening on ${docsUrl}`);
  log("info", "Watching for changes. Press Ctrl+C to stop.");

  await waitForTermination(async () => {
    if (rebuildTimer !== null) {
      clearTimeout(rebuildTimer);
      rebuildTimer = null;
    }

    clearWatchers();
    server.stop(true);
  });
}
