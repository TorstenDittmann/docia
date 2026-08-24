import { cp, mkdir, rm, stat } from "node:fs/promises";
import { dirname, posix, relative, resolve, sep } from "node:path";
import { loadSummaryGraph, resolveRedirectLocation } from "../book";
import type { SummaryGraph } from "../book";
import type { ResolvedConfig } from "../config/types";
import { CliError } from "../errors";
import { createMarkdownEngine, parseMarkdownDocument } from "../markdown";
import { renderNotFoundPage, renderPageLayout, renderRedirectPage } from "../render";
import { createSearchEntry, createSearchIndexArtifact, emitSearchIndex } from "../search";
import { toBasePathHref } from "../utils/html";
import { buildClientAssets } from "./client-assets";
import { optimizePublicImages } from "./optimize-images";
import type { ImageOptimizationResult } from "./optimize-images";
import { emitSeoArtifacts } from "./seo";

export interface BuildSiteResult {
	graph: SummaryGraph;
	outDirAbsolute: string;
	pageCount: number;
	copiedPublicDir: boolean;
	clientAssetCount: number;
	searchDocumentCount: number;
	markdownMirrorCount: number;
	redirectCount: number;
	imageOptimization: ImageOptimizationResult;
	emittedSeoFiles: string[];
	timing: {
		totalMs: number;
		cleanMs: number;
		imagesMs: number;
		assetsMs: number;
		pagesMs: number;
		searchAndSeoMs: number;
	};
	outputFiles: string[];
}

export type BuildProgressPhase = "clean" | "images" | "assets" | "pages" | "search-seo";
export type BuildProgressStatus = "start" | "progress" | "end";

export interface BuildProgressEvent {
	phase: BuildProgressPhase;
	status: BuildProgressStatus;
	current?: number;
	total?: number;
}

export interface BuildSiteOptions {
	minifyAssets?: boolean;
	sourcemapAssets?: Bun.BuildConfig["sourcemap"];
	includeDrafts?: boolean;
	liveReload?: boolean;
	onProgress?: (event: BuildProgressEvent) => void;
}

interface RedirectArtifact {
	outputPath: string;
	targetRoutePath: string;
}

async function isDirectory(pathValue: string): Promise<boolean> {
	try {
		const pathStat = await stat(pathValue);
		return pathStat.isDirectory();
	} catch {
		return false;
	}
}

function buildPageDescription(plainText: string): string {
	const text = plainText.trim();
	if (text.length <= 220) {
		return text;
	}

	return `${text.slice(0, 217)}...`;
}

function resolveRedirectArtifacts(config: ResolvedConfig, graph: SummaryGraph): RedirectArtifact[] {
	const claimedOutputs = new Map<string, string>();
	for (const chapter of graph.chapters) {
		const existing = claimedOutputs.get(chapter.outputPath);
		if (existing) {
			throw new CliError(
				`Duplicate output path \`${chapter.outputPath}\` for chapters \`${existing}\` and \`${chapter.sourcePath}\`.`,
			);
		}
		claimedOutputs.set(chapter.outputPath, chapter.sourcePath);
	}

	if (claimedOutputs.has("404.html")) {
		throw new CliError(
			"The page slug `/404` conflicts with docia's generated `404.html` page.",
		);
	}
	claimedOutputs.set("404.html", "generated 404 page");

	const redirects: RedirectArtifact[] = [];
	for (const chapter of graph.chapters) {
		for (const redirectFrom of chapter.frontmatter.redirectFrom ?? []) {
			const location = resolveRedirectLocation(redirectFrom, config.prettyUrls);
			const existing = claimedOutputs.get(location.outputPath);
			if (existing) {
				throw new CliError(
					`Redirect \`${redirectFrom}\` in ${chapter.sourcePath} conflicts with ${existing} at \`${location.outputPath}\`.`,
				);
			}

			claimedOutputs.set(location.outputPath, `redirect from ${chapter.sourcePath}`);
			redirects.push({
				outputPath: location.outputPath,
				targetRoutePath: chapter.routePath,
			});
		}
	}

	return redirects;
}

const EXTERNAL_LINK_PATTERN = /^(?:[a-zA-Z][a-zA-Z0-9+.-]*:|#|\/\/)/;
const MARKDOWN_PATH_PATTERN = /\.(md|markdown|mdown)$/i;
const ANCHOR_HREF_PATTERN = /<a\b([^>]*?)\bhref=("([^"]*)"|'([^']*)')([^>]*)>/gi;

function normalizeSourcePathFromHref(currentSourcePath: string, hrefPath: string): string | null {
	const normalizedHrefPath = hrefPath.replaceAll("\\", "/");
	const currentDirectory = dirname(currentSourcePath).replaceAll("\\", "/");
	const joined = normalizedHrefPath.startsWith("/")
		? normalizedHrefPath.slice(1)
		: posix.join(currentDirectory === "." ? "" : currentDirectory, normalizedHrefPath);

	const normalized = posix.normalize(joined);
	if (normalized === ".." || normalized.startsWith("../")) {
		return null;
	}

	return normalized;
}

function rewriteChapterLinks(
	html: string,
	currentSourcePath: string,
	graph: SummaryGraph,
	basePath: string,
): string {
	return html.replace(
		ANCHOR_HREF_PATTERN,
		(fullMatch, beforeHref, _quotedHref, doubleQuotedHref, singleQuotedHref, afterHref) => {
			const href = String(doubleQuotedHref ?? singleQuotedHref ?? "");
			const trimmedHref = href.trim();

			if (trimmedHref.length === 0 || EXTERNAL_LINK_PATTERN.test(trimmedHref)) {
				return fullMatch;
			}

			const hashIndex = trimmedHref.indexOf("#");
			const queryIndex = trimmedHref.indexOf("?");
			let pathPartEnd = trimmedHref.length;
			if (hashIndex >= 0) {
				pathPartEnd = Math.min(pathPartEnd, hashIndex);
			}
			if (queryIndex >= 0) {
				pathPartEnd = Math.min(pathPartEnd, queryIndex);
			}

			const pathPart = trimmedHref.slice(0, pathPartEnd);
			if (!MARKDOWN_PATH_PATTERN.test(pathPart)) {
				return fullMatch;
			}

			const queryPart =
				queryIndex >= 0
					? trimmedHref.slice(queryIndex, hashIndex >= 0 ? hashIndex : undefined)
					: "";
			const hashPart = hashIndex >= 0 ? trimmedHref.slice(hashIndex) : "";

			const normalizedSourcePath = normalizeSourcePathFromHref(currentSourcePath, pathPart);
			if (!normalizedSourcePath) {
				return fullMatch;
			}

			const chapter = graph.chapterBySourcePath.get(normalizedSourcePath);
			if (!chapter) {
				return fullMatch;
			}

			const routedHref = `${toBasePathHref(basePath, chapter.routePath)}${queryPart}${hashPart}`;
			return `<a${String(beforeHref)}href="${routedHref}"${String(afterHref)}>`;
		},
	);
}

export async function buildSite(
	config: ResolvedConfig,
	options: BuildSiteOptions = {},
): Promise<BuildSiteResult> {
	const emitProgress = (event: BuildProgressEvent): void => {
		options.onProgress?.(event);
	};

	const startedAt = Date.now();
	const graph = await loadSummaryGraph(config, { includeDrafts: options.includeDrafts === true });
	const redirects = resolveRedirectArtifacts(config, graph);
	const markdownEngine = await createMarkdownEngine(config);
	const searchEntries: ReturnType<typeof createSearchEntry>[] = [];
	const outputFiles: string[] = [];
	let markdownMirrorCount = 0;

	const toRelativeOutputPath = (absolutePath: string): string =>
		relative(config.outDirAbsolute, absolutePath).split(sep).join("/");

	const cleanStartedAt = Date.now();
	emitProgress({ phase: "clean", status: "start" });
	await rm(config.outDirAbsolute, { recursive: true, force: true });
	await mkdir(config.outDirAbsolute, { recursive: true });

	const copiedPublicDir = await isDirectory(config.publicDirAbsolute);
	if (copiedPublicDir) {
		await cp(config.publicDirAbsolute, config.outDirAbsolute, { recursive: true });
	}
	emitProgress({ phase: "clean", status: "end" });
	const cleanMs = Date.now() - cleanStartedAt;

	const imagesStartedAt = Date.now();
	emitProgress({ phase: "images", status: "start" });
	const imageOptimization = copiedPublicDir
		? await optimizePublicImages(config.publicDirAbsolute, config.outDirAbsolute, config.images)
		: {
				enabled: config.images.optimize,
				discoveredCount: 0,
				optimizedCount: 0,
				unchangedCount: 0,
				inputBytes: 0,
				outputBytes: 0,
				bytesSaved: 0,
			};
	emitProgress({ phase: "images", status: "end" });
	const imagesMs = Date.now() - imagesStartedAt;

	const assetsStartedAt = Date.now();
	emitProgress({ phase: "assets", status: "start" });
	const assets = await buildClientAssets(config, {
		minify: options.minifyAssets,
		sourcemap: options.sourcemapAssets,
	});
	assets.outputFiles.forEach((absolutePath) => {
		outputFiles.push(toRelativeOutputPath(absolutePath));
	});
	emitProgress({ phase: "assets", status: "end" });
	const assetsMs = Date.now() - assetsStartedAt;

	const totalPages = graph.chapters.length;
	const pagesStartedAt = Date.now();
	emitProgress({ phase: "pages", status: "start", total: totalPages });
	const renderedPages = [];
	for (const chapter of graph.chapters) {
		const chapterFile = Bun.file(chapter.sourceAbsolutePath);
		if (!(await chapterFile.exists())) {
			throw new CliError(
				`Chapter file does not exist for SUMMARY entry: ${chapter.sourcePath}`,
			);
		}

		const markdownSource = await chapterFile.text();
		const parsedDocument = parseMarkdownDocument(markdownSource, chapter.sourcePath);
		const rendered = markdownEngine.renderPage(parsedDocument.body);
		const contentHtml = rewriteChapterLinks(
			rendered.html,
			chapter.sourcePath,
			graph,
			config.basePath,
		);

		const searchEntry = createSearchEntry({
			id: chapter.id,
			title: parsedDocument.frontmatter.title ?? chapter.title,
			routePath: chapter.routePath,
			sourcePath: chapter.sourcePath,
			text: rendered.searchText,
		});
		searchEntries.push(searchEntry);
		renderedPages.push({
			chapter,
			contentHtml,
			headings: rendered.headings,
			pageDescription:
				parsedDocument.frontmatter.description ?? buildPageDescription(rendered.plainText),
			pageTitle: parsedDocument.frontmatter.title ?? chapter.title,
			pageOgImage: parsedDocument.frontmatter.ogImage ?? config.site.ogImage,
			noindex:
				parsedDocument.frontmatter.noindex === true ||
				parsedDocument.frontmatter.draft === true,
			markdownSource: parsedDocument.body,
		});
	}

	const searchIndex = createSearchIndexArtifact(searchEntries);
	for (const [chapterIndex, page] of renderedPages.entries()) {
		const {
			chapter,
			contentHtml,
			headings,
			pageDescription,
			pageTitle,
			pageOgImage,
			noindex,
			markdownSource,
		} = page;

		const html = renderPageLayout({
			config,
			graph,
			chapter,
			contentHtml,
			headings,
			pageDescription,
			assets,
			searchIndexFileName: searchIndex.fileName,
			pageTitle,
			pageOgImage,
			noindex,
			liveReload: options.liveReload === true,
		});

		const outputPath = resolve(config.outDirAbsolute, chapter.outputPath);
		await mkdir(dirname(outputPath), { recursive: true });
		await Bun.write(outputPath, html);
		outputFiles.push(chapter.outputPath);

		const markdownOutputPath = resolve(config.outDirAbsolute, `${chapter.outputPath}.md`);
		await mkdir(dirname(markdownOutputPath), { recursive: true });
		await Bun.write(markdownOutputPath, markdownSource);
		markdownMirrorCount += 1;
		outputFiles.push(`${chapter.outputPath}.md`);

		emitProgress({
			phase: "pages",
			status: "progress",
			current: chapterIndex + 1,
			total: totalPages,
		});
	}
	emitProgress({ phase: "pages", status: "end", current: totalPages, total: totalPages });
	const pagesMs = Date.now() - pagesStartedAt;

	const searchAndSeoStartedAt = Date.now();
	emitProgress({ phase: "search-seo", status: "start" });
	await emitSearchIndex(config.outDirAbsolute, searchIndex);
	outputFiles.push(searchIndex.fileName);

	for (const redirect of redirects) {
		const redirectOutputPath = resolve(config.outDirAbsolute, redirect.outputPath);
		await mkdir(dirname(redirectOutputPath), { recursive: true });
		await Bun.write(
			redirectOutputPath,
			renderRedirectPage(config, assets, redirect.targetRoutePath),
		);
		outputFiles.push(redirect.outputPath);
	}

	await Bun.write(resolve(config.outDirAbsolute, "404.html"), renderNotFoundPage(config, assets));
	outputFiles.push("404.html");

	const emittedSeoFiles = await emitSeoArtifacts(config, graph, searchIndex.fileName);
	outputFiles.push(...emittedSeoFiles);
	emitProgress({ phase: "search-seo", status: "end" });
	const searchAndSeoMs = Date.now() - searchAndSeoStartedAt;
	const totalMs = Date.now() - startedAt;

	const uniqueOutputFiles = [...new Set(outputFiles)].sort((left, right) =>
		left.localeCompare(right),
	);

	return {
		graph,
		outDirAbsolute: config.outDirAbsolute,
		pageCount: graph.chapters.length,
		copiedPublicDir,
		clientAssetCount: assets.outputFiles.length,
		searchDocumentCount: searchEntries.length,
		markdownMirrorCount,
		redirectCount: redirects.length,
		imageOptimization,
		emittedSeoFiles,
		timing: {
			totalMs,
			cleanMs,
			imagesMs,
			assetsMs,
			pagesMs,
			searchAndSeoMs,
		},
		outputFiles: uniqueOutputFiles,
	};
}
