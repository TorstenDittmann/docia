import { relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import type { ResolvedConfig } from "../config/types";
import { CliError } from "../errors";
import { toBasePathHref } from "../utils/html";

export interface ClientAssetManifest {
	scriptHref: string | null;
	stylesheetHref: string | null;
	outputFiles: string[];
}

export interface BuildClientAssetsOptions {
	minify?: boolean;
	sourcemap?: Bun.BuildConfig["sourcemap"];
}

function toWebPath(pathValue: string): string {
	return pathValue.split(sep).join("/");
}

function toHref(config: ResolvedConfig, absolutePath: string): string {
	const relativePath = toWebPath(relative(config.outDirAbsolute, absolutePath));
	return toBasePathHref(config.basePath, `/${relativePath}`);
}

interface BuildLogLike {
	message: string;
	position?: {
		file?: string;
		line?: number;
		column?: number;
	} | null;
}

function formatBuildLogs(logs: BuildLogLike[]): string {
	if (logs.length === 0) {
		return "unknown build error";
	}

	return logs
		.map((log) => {
			if (log.position?.file) {
				const line = log.position.line ?? 0;
				const column = log.position.column ?? 0;
				return `${log.position.file}:${line}:${column} ${log.message}`;
			}

			return log.message;
		})
		.join("\n");
}

export async function buildClientAssets(
	config: ResolvedConfig,
	options: BuildClientAssetsOptions = {},
): Promise<ClientAssetManifest> {
	const entrypointPath = fileURLToPath(new URL("../client/main.ts", import.meta.url));

	const result = await Bun.build({
		entrypoints: [entrypointPath],
		outdir: config.outDirAbsolute,
		target: "browser",
		format: "esm",
		splitting: true,
		minify: options.minify ?? true,
		sourcemap: options.sourcemap ?? "none",
		naming: {
			entry: "assets/[name]-[hash].[ext]",
			chunk: "assets/[name]-[hash].[ext]",
			asset: "assets/[name]-[hash].[ext]",
		},
		loader: {
			".css": "css",
		},
	});

	if (!result.success) {
		throw new CliError(`Failed to bundle client assets:\n${formatBuildLogs(result.logs)}`);
	}

	let scriptHref: string | null = null;
	let stylesheetHref: string | null = null;
	const outputFiles: string[] = [];

	for (const artifact of result.outputs) {
		outputFiles.push(artifact.path);

		if (artifact.kind === "entry-point" && artifact.path.endsWith(".js")) {
			scriptHref = toHref(config, artifact.path);
		}

		if (artifact.path.endsWith(".css") && stylesheetHref === null) {
			stylesheetHref = toHref(config, artifact.path);
		}
	}

	if (scriptHref === null) {
		throw new CliError("Client bundle did not emit a JavaScript entry file.");
	}

	return {
		scriptHref,
		stylesheetHref,
		outputFiles,
	};
}
