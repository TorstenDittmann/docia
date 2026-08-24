import { stat } from "node:fs/promises";
import { watch, type FSWatcher } from "node:fs";
import { relative } from "node:path";
import { buildSite } from "../build";
import { loadConfig } from "../config/load-config";
import type { ResolvedConfig } from "../config/types";
import { CliError } from "../errors";
import { serveStaticRequest } from "../server/static";
import { toBasePathHref } from "../utils/html";
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
		throw new CliError(`Invalid port: ${options.port}. Expected a value between 1 and 65535.`);
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
		includeDrafts: true,
		liveReload: true,
	});

	const watchers: FSWatcher[] = [];

	let isBuilding = false;
	let pendingReason: string | null = null;
	let rebuildTimer: ReturnType<typeof setTimeout> | null = null;

	const liveReloadClients = new Set<ReadableStreamDefaultController<Uint8Array>>();
	const encoder = new TextEncoder();
	const broadcastReload = (): void => {
		const message = encoder.encode(`event: reload\ndata: ${Date.now()}\n\n`);
		for (const client of liveReloadClients) {
			try {
				client.enqueue(message);
			} catch {
				liveReloadClients.delete(client);
			}
		}
	};

	const server = Bun.serve({
		port: options.port,
		hostname: options.host,
		fetch: async (request) => {
			const url = new URL(request.url);
			const eventPath = toBasePathHref(activeConfig.basePath, "/__docia/events");
			if (url.pathname === eventPath) {
				let controller: ReadableStreamDefaultController<Uint8Array> | null = null;
				const stream = new ReadableStream<Uint8Array>({
					start(nextController) {
						controller = nextController;
						liveReloadClients.add(nextController);
						nextController.enqueue(encoder.encode("retry: 1000\n\n"));
					},
					cancel() {
						if (controller) {
							liveReloadClients.delete(controller);
						}
					},
				});

				return new Response(stream, {
					headers: {
						"cache-control": "no-cache, no-transform",
						connection: "keep-alive",
						"content-type": "text/event-stream",
					},
				});
			}

			return serveStaticRequest({
				config: activeConfig,
				request,
				noCache: true,
			});
		},
	});
	const heartbeatTimer = setInterval(() => {
		const heartbeat = encoder.encode(`: ping ${Date.now()}\n\n`);
		for (const client of liveReloadClients) {
			try {
				client.enqueue(heartbeat);
			} catch {
				liveReloadClients.delete(client);
			}
		}
	}, 15_000);

	const clearWatchers = (): void => {
		for (const watcher of watchers) {
			watcher.close();
		}
		watchers.length = 0;
	};

	const watchPath = async (
		pathValue: string,
		recursive: boolean,
		ignoreWhileBuilding = false,
	): Promise<void> => {
		const kind = await getPathKind(pathValue);
		if (kind === null) {
			return;
		}

		if (recursive && kind !== "directory") {
			return;
		}

		const watcher = watch(pathValue, { recursive }, (eventType, filename) => {
			if (ignoreWhileBuilding && isBuilding) {
				return;
			}

			const fileLabel = typeof filename === "string" ? filename : "unknown";
			queueRebuild(`${eventType}:${fileLabel}`);
		});

		watcher.on("error", (error) => {
			log("error", `Watcher error on ${pathValue}: ${formatError(error)}`);
		});

		watchers.push(watcher);
	};

	const refreshWatchers = async (config: ResolvedConfig): Promise<void> => {
		clearWatchers();

		await watchPath(config.srcDirAbsolute, true);
		await watchPath(config.publicDirAbsolute, true, true);

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
				includeDrafts: true,
				liveReload: true,
			});
			await refreshWatchers(activeConfig);
			broadcastReload();

			const changedFrom = reason.trim().length > 0 ? reason : "file change";
			log(
				"info",
				`Rebuilt ${result.pageCount} pages (${changedFrom}) -> ${
					relative(options.cwd, result.outDirAbsolute) || "."
				}`,
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
		clearInterval(heartbeatTimer);
		for (const client of liveReloadClients) {
			try {
				client.close();
			} catch {}
		}
		liveReloadClients.clear();
		server.stop(true);
	});
}
