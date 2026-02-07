import { cp, mkdir, rm, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { loadSummaryGraph } from "../book";
import type { SummaryGraph } from "../book";
import type { ResolvedConfig } from "../config/types";
import { CliError } from "../errors";
import { createMarkdownEngine } from "../markdown";
import { renderPageLayout } from "../render";
import { createSearchEntry, emitSearchIndex } from "../search";
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

export async function buildSite(
  config: ResolvedConfig,
  options: BuildSiteOptions = {},
): Promise<BuildSiteResult> {
  const graph = await loadSummaryGraph(config);
  const markdownEngine = createMarkdownEngine(config);
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

    searchEntries.push(
      createSearchEntry({
        id: chapter.id,
        title: chapter.title,
        routePath: chapter.routePath,
        sourcePath: chapter.sourcePath,
        text: rendered.plainText,
      }),
    );

    const html = renderPageLayout({
      config,
      graph,
      chapter,
      contentHtml: rendered.html,
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
