import type {
  SummaryChapterEntry,
  SummaryEntry,
  SummaryGraph,
  SummaryLinkEntry,
} from "../book";
import type { ResolvedConfig } from "../config/types";
import type { MarkdownHeading } from "../markdown";
import { encodePathForHref, escapeHtml, toBasePathHref } from "../utils/html";

export interface RenderAssetManifest {
  scriptHref: string | null;
  stylesheetHref: string | null;
}

export interface RenderPageLayoutInput {
  config: ResolvedConfig;
  graph: SummaryGraph;
  chapter: SummaryChapterEntry;
  contentHtml: string;
  headings: MarkdownHeading[];
  pageDescription: string;
  assets: RenderAssetManifest;
}

const DOCIA_GITHUB_URL = "https://github.com/dociajs/docia";

function getChapterById(
  graph: SummaryGraph,
  chapterId: string | null,
): SummaryChapterEntry | null {
  if (!chapterId) {
    return null;
  }

  const entry = graph.entryById.get(chapterId);
  if (!entry || entry.kind !== "chapter") {
    return null;
  }

  return entry;
}

function resolveMetaDescription(config: ResolvedConfig, pageDescription: string): string {
  const preferred = pageDescription.trim();
  const fallback = config.site.description.trim();
  const selected = preferred.length > 0 ? preferred : fallback;

  if (selected.length <= 180) {
    return selected;
  }

  return `${selected.slice(0, 177)}...`;
}

function resolveCanonicalUrl(config: ResolvedConfig, routePath: string): string | null {
  const siteUrl = config.site.url.trim();
  if (siteUrl.length === 0) {
    return null;
  }

  try {
    const href = toBasePathHref(config.basePath, routePath);
    return new URL(href, siteUrl).toString();
  } catch {
    return null;
  }
}

function toJsonScript(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function renderLinkEntry(
  entry: SummaryLinkEntry,
  config: ResolvedConfig,
  activeChapterId: string,
): string {
  const activeClass = entry.id === activeChapterId ? " is-active" : "";
  const href = entry.external
    ? entry.href
    : toBasePathHref(config.basePath, entry.href);
  const target = entry.external ? ' target="_blank" rel="noopener noreferrer"' : "";

  return `<li class="summary-item${activeClass}"><a href="${escapeHtml(href)}"${target}>${escapeHtml(entry.title)}</a></li>`;
}

function renderSummaryEntry(
  entry: SummaryEntry,
  config: ResolvedConfig,
  activeChapterId: string,
): string {
  if (entry.kind === "section") {
    const children =
      entry.children.length > 0
        ? `<ul class="summary-list">${entry.children
            .map((child) => renderSummaryEntry(child, config, activeChapterId))
            .join("")}</ul>`
        : "";

    return `<li class="summary-group"><span class="summary-group-title">${escapeHtml(entry.title)}</span>${children}</li>`;
  }

  if (entry.kind === "link") {
    return renderLinkEntry(entry, config, activeChapterId);
  }

  const activeClass = entry.id === activeChapterId ? " is-active" : "";
  const href = toBasePathHref(config.basePath, entry.routePath);
  const children =
    entry.children.length > 0
      ? `<ul class="summary-list">${entry.children
          .map((child) => renderSummaryEntry(child, config, activeChapterId))
          .join("")}</ul>`
      : "";

  return `<li class="summary-item${activeClass}"><a href="${escapeHtml(href)}">${escapeHtml(entry.title)}</a>${children}</li>`;
}

function renderTableOfContents(
  config: ResolvedConfig,
  headings: MarkdownHeading[],
): string {
  const tocHeadings = headings.filter(
    (heading) => heading.id && heading.level >= 2 && heading.level <= 3,
  );

  if (tocHeadings.length === 0) {
    return "";
  }

  const items = tocHeadings
    .map((heading) => {
      const href = toBasePathHref(config.basePath, `#${heading.id ?? ""}`);
      return `<li class="toc-item toc-level-${heading.level}"><a href="${escapeHtml(href)}">${escapeHtml(
        heading.text,
      )}</a></li>`;
    })
    .join("");

  return `<aside class="toc"><h2>On this page</h2><ul>${items}</ul></aside>`;
}

function renderPagination(
  config: ResolvedConfig,
  graph: SummaryGraph,
  chapter: SummaryChapterEntry,
): string {
  const previousChapter = getChapterById(graph, chapter.previousChapterId);
  const nextChapter = getChapterById(graph, chapter.nextChapterId);

  if (!previousChapter && !nextChapter) {
    return "";
  }

  const previousHtml = previousChapter
    ? `<a class="pager-link" href="${escapeHtml(
        toBasePathHref(config.basePath, previousChapter.routePath),
      )}"><span>Previous</span><strong>${escapeHtml(previousChapter.title)}</strong></a>`
    : '<span class="pager-spacer"></span>';

  const nextHtml = nextChapter
    ? `<a class="pager-link" href="${escapeHtml(
        toBasePathHref(config.basePath, nextChapter.routePath),
      )}"><span>Next</span><strong>${escapeHtml(nextChapter.title)}</strong></a>`
    : '<span class="pager-spacer"></span>';

  return `<nav class="pager">${previousHtml}${nextHtml}</nav>`;
}

function normalizeExternalUrl(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

function joinUrlPath(baseUrl: string, pathValue: string): string {
  const base = baseUrl.replace(/\/+$/, "");
  const path = pathValue.replace(/^\/+/, "");
  return `${base}/${path}`;
}

function resolveEditUrl(
  config: ResolvedConfig,
  chapter: SummaryChapterEntry,
): string | null {
  const sourcePath = encodePathForHref(chapter.sourcePath);

  const explicitBase = normalizeExternalUrl(config.site.githubEditBaseUrl);
  if (explicitBase) {
    return joinUrlPath(explicitBase, sourcePath);
  }

  const githubRepoUrl = normalizeExternalUrl(config.site.socials.github);
  if (!githubRepoUrl) {
    return null;
  }

  try {
    const parsed = new URL(githubRepoUrl);
    if (parsed.hostname !== "github.com") {
      return null;
    }

    const segments = parsed.pathname.split("/").filter((segment) => segment.length > 0);
    if (segments.length < 2) {
      return null;
    }

    const owner = segments[0] ?? "";
    const repository = (segments[1] ?? "").replace(/\.git$/i, "");
    if (owner.length === 0 || repository.length === 0) {
      return null;
    }

    const branch = encodeURIComponent(config.site.githubEditBranch || "main");
    const sourceRoot = config.site.githubEditPath || config.srcDir;
    const rootPath = encodePathForHref(sourceRoot).replace(/^\/+/, "");
    const fullPath = rootPath.length > 0 ? `${rootPath}/${sourcePath}` : sourcePath;

    return `https://github.com/${owner}/${repository}/edit/${branch}/${fullPath}`;
  } catch {
    return null;
  }
}

function renderSidebarFooter(config: ResolvedConfig): string {
  const socialLinks: string[] = [];
  const githubHref = normalizeExternalUrl(config.site.socials.github);
  const xHref = normalizeExternalUrl(config.site.socials.x);

  if (githubHref) {
    socialLinks.push(
      `<a class="sidebar-social-link" href="${escapeHtml(githubHref)}" target="_blank" rel="noopener noreferrer">GitHub</a>`,
    );
  }

  if (xHref) {
    socialLinks.push(
      `<a class="sidebar-social-link" href="${escapeHtml(xHref)}" target="_blank" rel="noopener noreferrer">X</a>`,
    );
  }

  const socialsHtml =
    socialLinks.length > 0
      ? `<div class="sidebar-socials">${socialLinks.join("")}</div>`
      : "";

  return `<div class="sidebar-footer">${socialsHtml}<a class="powered-by" href="${escapeHtml(
    DOCIA_GITHUB_URL,
  )}" target="_blank" rel="noopener noreferrer">Powered by docsia</a></div>`;
}

function renderHead(
  config: ResolvedConfig,
  chapter: SummaryChapterEntry,
  pageDescription: string,
  assets: RenderAssetManifest,
): string {
  const siteTitle = config.site.title;
  const pageTitle = `${chapter.title} - ${siteTitle}`;
  const canonical = resolveCanonicalUrl(config, chapter.routePath);
  const description = resolveMetaDescription(config, pageDescription);

  const canonicalTag = canonical
    ? `<link rel="canonical" href="${escapeHtml(canonical)}">`
    : "";
  const descriptionTag =
    description.length > 0
      ? `<meta name="description" content="${escapeHtml(description)}">`
      : "";

  const jsonLd = canonical
    ? `<script type="application/ld+json">${toJsonScript({
        "@context": "https://schema.org",
        "@type": "TechArticle",
        headline: chapter.title,
        inLanguage: config.site.language,
        description: description || undefined,
        isPartOf: {
          "@type": "CreativeWork",
          name: config.site.title,
        },
        mainEntityOfPage: canonical,
      })}</script>`
    : "";

  const searchIndexHref = toBasePathHref(config.basePath, "/search-index.json");
  const llmsHref = toBasePathHref(config.basePath, "/llms.txt");
  const markdownHref = toBasePathHref(
    config.basePath,
    `/${encodePathForHref(`${chapter.outputPath}.md`)}`,
  );
  const stylesheetTag = assets.stylesheetHref
    ? `<link rel="stylesheet" href="${escapeHtml(assets.stylesheetHref)}">`
    : "";

  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(pageTitle)}</title>
<meta name="generator" content="docia">
<meta name="docia-base-path" content="${escapeHtml(config.basePath)}">
<meta name="docia-search-index" content="${escapeHtml(searchIndexHref)}">
<meta name="docia-markdown-url" content="${escapeHtml(markdownHref)}">
<meta name="docia-llms-url" content="${escapeHtml(llmsHref)}">
<meta name="theme-color" content="#0f172a">
<meta name="robots" content="index,follow">
<meta property="og:type" content="article">
<meta property="og:title" content="${escapeHtml(pageTitle)}">
${descriptionTag}
${canonicalTag}
${stylesheetTag}
${jsonLd}`;
}

function renderClientScriptTag(assets: RenderAssetManifest): string {
  if (!assets.scriptHref) {
    return "";
  }

  return `<script type="module" src="${escapeHtml(assets.scriptHref)}"></script>`;
}

export function renderPageLayout(input: RenderPageLayoutInput): string {
  const { config, graph, chapter, contentHtml, headings, pageDescription, assets } = input;
  const head = renderHead(config, chapter, pageDescription, assets);

  const markdownHref = toBasePathHref(
    config.basePath,
    `/${encodePathForHref(`${chapter.outputPath}.md`)}`,
  );

  const sidebar = graph.entries
    .map((entry) => renderSummaryEntry(entry, config, chapter.id))
    .join("");
  const sidebarFooter = renderSidebarFooter(config);
  const editUrl = resolveEditUrl(config, chapter);
  const toc = renderTableOfContents(config, headings);
  const hasToc = toc.length > 0;
  const appClassName = hasToc ? "app" : "app app-no-toc";
  const pagination = renderPagination(config, graph, chapter);
  const clientScriptTag = renderClientScriptTag(assets);

  return `<!doctype html>
<html lang="${escapeHtml(config.site.language)}">
  <head>
    ${head}
  </head>
  <body>
    <div class="${appClassName}">
      <aside class="sidebar">
        <p class="brand">${escapeHtml(config.site.title)}</p>
        <button id="gd-command-trigger" class="command-trigger" type="button" aria-haspopup="dialog" aria-controls="gd-command-overlay" aria-expanded="false">
          <span class="command-trigger-icon" aria-hidden="true">⌘</span>
          <span class="command-trigger-label">Search docs</span>
        </button>
        <nav aria-label="Chapters">
          <ul class="summary-list">${sidebar}</ul>
        </nav>
        ${sidebarFooter}
      </aside>
      <main class="content">
        <header class="content-header">
          <div class="content-header-row">
            <small>${escapeHtml(config.site.title)}</small>
            <div class="page-actions">
              ${
                editUrl
                  ? `<a class="page-edit-link" href="${escapeHtml(editUrl)}" target="_blank" rel="noopener noreferrer">Edit file</a>`
                  : ""
              }
              <div class="page-ai-split">
                <button id="gd-page-copy-trigger" class="page-ai-copy" type="button">Copy markdown</button>
                <button id="gd-page-ai-trigger" class="page-ai-chevron" type="button" aria-haspopup="menu" aria-controls="gd-page-ai-menu" aria-expanded="false" aria-label="More markdown actions">▾</button>
              </div>
              <div id="gd-page-ai-menu" class="page-ai-menu" role="menu" hidden>
                <a class="page-ai-menu-item" href="${escapeHtml(markdownHref)}" target="_blank" rel="noopener noreferrer" data-ai-action="view-markdown" role="menuitem">View markdown</a>
                <a class="page-ai-menu-item" href="#" target="_blank" rel="noopener noreferrer" data-ai-action="open-chatgpt" role="menuitem">Open in ChatGPT</a>
                <a class="page-ai-menu-item" href="#" target="_blank" rel="noopener noreferrer" data-ai-action="open-claude" role="menuitem">Open in Claude</a>
              </div>
            </div>
          </div>
        </header>
        <article class="markdown">${contentHtml}</article>
        ${pagination}
      </main>
      ${toc}
    </div>
    <div id="gd-command-overlay" class="command-overlay" hidden>
      <div class="command-menu" role="dialog" aria-modal="true" aria-label="Search documentation">
        <div class="command-input-row">
          <input id="gd-command-input" type="search" placeholder="Type a command or search docs..." autocomplete="off" spellcheck="false">
        </div>
        <ul id="gd-command-results" class="command-results"></ul>
        <div class="command-footer">
          <span>↑↓ navigate</span>
          <span>Enter open</span>
          <span>Esc close</span>
        </div>
      </div>
    </div>
    ${clientScriptTag}
  </body>
</html>`;
}
