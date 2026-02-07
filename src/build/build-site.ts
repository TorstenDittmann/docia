import { cp, mkdir, rm, stat } from "node:fs/promises";
import { dirname, posix, resolve } from "node:path";
import { loadSummaryGraph } from "../book";
import type { SummaryGraph } from "../book";
import type { ResolvedConfig } from "../config/types";
import { CliError } from "../errors";
import { createMarkdownEngine } from "../markdown";
import { renderPageLayout } from "../render";
import { createSearchEntry, emitSearchIndex } from "../search";
import { toBasePathHref } from "../utils/html";
import { buildClientAssets } from "./client-assets";
import { emitSeoArtifacts } from "./seo";

export interface BuildSiteResult {
  graph: SummaryGraph;
  outDirAbsolute: string;
  pageCount: number;
  copiedPublicDir: boolean;
}

export interface BuildSiteOptions {
  minifyAssets?: boolean;
  sourcemapAssets?: Bun.BuildConfig["sourcemap"];
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

const EXTERNAL_LINK_PATTERN = /^(?:[a-zA-Z][a-zA-Z0-9+.-]*:|#|\/\/)/;
const MARKDOWN_PATH_PATTERN = /\.(md|markdown|mdown)$/i;
const ANCHOR_HREF_PATTERN = /<a\b([^>]*?)\bhref=("([^"]*)"|'([^']*)')([^>]*)>/gi;

function normalizeSourcePathFromHref(
  currentSourcePath: string,
  hrefPath: string,
): string | null {
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
  const graph = await loadSummaryGraph(config);
  const markdownEngine = await createMarkdownEngine(config);
  const searchEntries: ReturnType<typeof createSearchEntry>[] = [];

  await rm(config.outDirAbsolute, { recursive: true, force: true });
  await mkdir(config.outDirAbsolute, { recursive: true });

  const copiedPublicDir = await isDirectory(config.publicDirAbsolute);
  if (copiedPublicDir) {
    await cp(config.publicDirAbsolute, config.outDirAbsolute, { recursive: true });
  }

  const assets = await buildClientAssets(config, {
    minify: options.minifyAssets,
    sourcemap: options.sourcemapAssets,
  });

  for (const chapter of graph.chapters) {
    const chapterFile = Bun.file(chapter.sourceAbsolutePath);
    if (!(await chapterFile.exists())) {
      throw new CliError(
        `Chapter file does not exist for SUMMARY entry: ${chapter.sourcePath}`,
      );
    }

    const markdownSource = await chapterFile.text();
    const rendered = markdownEngine.renderPage(markdownSource);
    const contentHtml = rewriteChapterLinks(
      rendered.html,
      chapter.sourcePath,
      graph,
      config.basePath,
    );

    searchEntries.push(
      createSearchEntry({
        id: chapter.id,
        title: chapter.title,
        routePath: chapter.routePath,
        sourcePath: chapter.sourcePath,
        text: rendered.searchText,
      }),
    );

    const html = renderPageLayout({
      config,
      graph,
      chapter,
      contentHtml,
      headings: rendered.headings,
      pageDescription: buildPageDescription(rendered.plainText),
      assets,
    });

    const outputPath = resolve(config.outDirAbsolute, chapter.outputPath);
    await mkdir(dirname(outputPath), { recursive: true });
    await Bun.write(outputPath, html);

    const markdownOutputPath = resolve(config.outDirAbsolute, `${chapter.outputPath}.md`);
    await mkdir(dirname(markdownOutputPath), { recursive: true });
    await Bun.write(markdownOutputPath, markdownSource);
  }

  await emitSearchIndex(config.outDirAbsolute, searchEntries);
  await emitSeoArtifacts(config, graph);

  return {
    graph,
    outDirAbsolute: config.outDirAbsolute,
    pageCount: graph.chapters.length,
    copiedPublicDir,
  };
}
