import type { ResolvedConfig } from "../config/types";
import { CliError } from "../errors";
import { toBasePathHref } from "../utils/html";

// Import client source files as raw strings
import mainTs from "../client/main.ts" with { type: "text" };
import routerTs from "../client/router.ts" with { type: "text" };
import searchTs from "../client/search.ts" with { type: "text" };
import stylesCss from "../client/styles.css" with { type: "text" };

const CLIENT_FILES = {
	"main.ts": mainTs,
	"./router.ts": routerTs,
	"./search.ts": searchTs,
	"./styles.css": stylesCss,
};

export interface ClientAssetManifest {
	scriptHref: string | null;
	stylesheetHref: string | null;
	outputFiles: string[];
}

export interface BuildClientAssetsOptions {
	minify?: boolean;
	sourcemap?: Bun.BuildConfig["sourcemap"];
}

export async function buildClientAssets(
	config: ResolvedConfig,
	options: BuildClientAssetsOptions = {},
): Promise<ClientAssetManifest> {
	const result = await Bun.build({
		entrypoints: ["main.ts"],
		outdir: config.outDirAbsolute,
		target: "browser",
		format: "esm",
		splitting: true,
		minify: options.minify ?? true,
		sourcemap: options.sourcemap ?? "none",
		naming: {
			entry: "[name]-[hash].[ext]",
			chunk: "[name]-[hash].[ext]",
			asset: "[name]-[hash].[ext]",
		},
		loader: {
			".css": "css",
		},
		files: CLIENT_FILES,
	});

	if (!result.success) {
		throw new CliError("Failed to bundle client assets");
	}

	let scriptHref: string | null = null;
	let stylesheetHref: string | null = null;
	const outputFiles: string[] = [];

	for (const artifact of result.outputs) {
		outputFiles.push(artifact.path);

		if (artifact.kind === "entry-point" && artifact.path.endsWith(".js")) {
			const relativePath = artifact.path
				.replace(config.outDirAbsolute, "")
				.replace(/^\//, "");
			scriptHref = toBasePathHref(config.basePath, `/${relativePath}`);
		}

		if (artifact.path.endsWith(".css") && stylesheetHref === null) {
			const relativePath = artifact.path
				.replace(config.outDirAbsolute, "")
				.replace(/^\//, "");
			stylesheetHref = toBasePathHref(config.basePath, `/${relativePath}`);
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
