import { resolve } from "node:path";
import type { SummaryGraph } from "../book";
import type { ResolvedConfig } from "../config/types";
import { encodePathForHref, toBasePathHref } from "../utils/html";

function maybeAbsoluteUrl(config: ResolvedConfig, href: string): string | null {
  const siteUrl = config.site.url.trim();
  if (siteUrl.length === 0) {
    return null;
  }

  try {
    return new URL(href, siteUrl).toString();
  } catch {
    return null;
  }
}

function buildSitemapXml(urls: string[]): string {
  const entries = urls
    .map((url) => `<url><loc>${url}</loc></url>`)
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}</urlset>\n`;
}

function buildRobotsTxt(sitemapUrl: string | null): string {
  const lines = ["User-agent: *", "Allow: /"];
  if (sitemapUrl) {
    lines.push(`Sitemap: ${sitemapUrl}`);
  }

  return `${lines.join("\n")}\n`;
}

function toMarkdownPageHref(config: ResolvedConfig, outputPath: string): string {
  return toBasePathHref(config.basePath, `/${encodePathForHref(`${outputPath}.md`)}`);
}

function buildLlmsTxt(config: ResolvedConfig, graph: SummaryGraph): string {
  const lines: string[] = [];
  lines.push(`# ${config.site.title}`);
  lines.push("");

  const summary = config.site.description.trim();
  if (summary.length > 0) {
    lines.push(`> ${summary}`);
    lines.push("");
  }

  lines.push(
    "This file follows the llms.txt standard and links to markdown versions of key documentation pages.",
  );
  lines.push("");
  lines.push("## Docs");
  lines.push("");

  for (const chapter of graph.chapters) {
    const markdownHref = toMarkdownPageHref(config, chapter.outputPath);
    const href = maybeAbsoluteUrl(config, markdownHref) ?? markdownHref;
    lines.push(`- [${chapter.title}](${href}): Markdown source for ${chapter.routePath}`);
  }

  lines.push("");
  lines.push("## Optional");
  lines.push("");

  const llmsHref = maybeAbsoluteUrl(config, toBasePathHref(config.basePath, "/llms.txt"));
  const sitemapHref = maybeAbsoluteUrl(config, toBasePathHref(config.basePath, "/sitemap.xml"));
  const searchHref = maybeAbsoluteUrl(
    config,
    toBasePathHref(config.basePath, "/search-index.json"),
  );

  lines.push(`- [llms.txt](${llmsHref ?? toBasePathHref(config.basePath, "/llms.txt")}): Index of LLM-facing docs links`);
  lines.push(`- [Sitemap](${sitemapHref ?? toBasePathHref(config.basePath, "/sitemap.xml")}): XML sitemap for the documentation site`);
  lines.push(`- [Search Index](${searchHref ?? toBasePathHref(config.basePath, "/search-index.json")}): Client-side search data`);

  return `${lines.join("\n")}\n`;
}

export async function emitSeoArtifacts(
  config: ResolvedConfig,
  graph: SummaryGraph,
): Promise<string[]> {
  const emittedFiles: string[] = [];

  const chapterUrls = graph.chapters
    .map((chapter) => {
      const routeHref = toBasePathHref(config.basePath, chapter.routePath);
      return maybeAbsoluteUrl(config, routeHref);
    })
    .filter((url): url is string => url !== null);

  if (chapterUrls.length > 0) {
    const sitemapXml = buildSitemapXml(chapterUrls);
    await Bun.write(resolve(config.outDirAbsolute, "sitemap.xml"), sitemapXml);
    emittedFiles.push("sitemap.xml");
  }

  const sitemapHref = maybeAbsoluteUrl(
    config,
    toBasePathHref(config.basePath, "/sitemap.xml"),
  );
  const robotsTxt = buildRobotsTxt(sitemapHref);
  await Bun.write(resolve(config.outDirAbsolute, "robots.txt"), robotsTxt);
  emittedFiles.push("robots.txt");

  const llmsTxt = buildLlmsTxt(config, graph);
  await Bun.write(resolve(config.outDirAbsolute, "llms.txt"), llmsTxt);
  emittedFiles.push("llms.txt");

  return emittedFiles;
}
