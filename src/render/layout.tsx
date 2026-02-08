import type { JSX } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type {
  SummaryChapterEntry,
  SummaryEntry,
  SummaryGraph,
  SummaryLinkEntry,
} from "../book";
import type { ResolvedConfig } from "../config/types";
import type { MarkdownHeading } from "../markdown";
import { encodePathForHref, toBasePathHref } from "../utils/html";

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

function SidebarEntry(props: {
  entry: SummaryEntry;
  config: ResolvedConfig;
  activeChapterId: string;
}): JSX.Element {
  const { entry, config, activeChapterId } = props;

  if (entry.kind === "section") {
    return (
      <li className="summary-group">
        <span className="summary-group-title">{entry.title}</span>
        {entry.children.length > 0 ? (
          <ul className="summary-list">
            {entry.children.map((child) => (
              <SidebarEntry
                key={child.id}
                entry={child}
                config={config}
                activeChapterId={activeChapterId}
              />
            ))}
          </ul>
        ) : null}
      </li>
    );
  }

  if (entry.kind === "link") {
    const linkEntry = entry as SummaryLinkEntry;
    const activeClass = linkEntry.id === activeChapterId ? " is-active" : "";
    const href = linkEntry.external
      ? linkEntry.href
      : toBasePathHref(config.basePath, linkEntry.href);

    return (
      <li className={`summary-item${activeClass}`}>
        <a
          href={href}
          target={linkEntry.external ? "_blank" : undefined}
          rel={linkEntry.external ? "noopener noreferrer" : undefined}
        >
          {linkEntry.title}
        </a>
      </li>
    );
  }

  const activeClass = entry.id === activeChapterId ? " is-active" : "";
  const href = toBasePathHref(config.basePath, entry.routePath);

  return (
    <li className={`summary-item${activeClass}`}>
      <a href={href}>{entry.title}</a>
      {entry.children.length > 0 ? (
        <ul className="summary-list">
          {entry.children.map((child) => (
            <SidebarEntry
              key={child.id}
              entry={child}
              config={config}
              activeChapterId={activeChapterId}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function renderSidebarFooter(config: ResolvedConfig): JSX.Element {
  const githubHref = normalizeExternalUrl(config.site.socials.github);
  const xHref = normalizeExternalUrl(config.site.socials.x);

  return (
    <div className="sidebar-footer">
      {githubHref || xHref ? (
        <div className="sidebar-socials">
          {githubHref ? (
            <a
              className="sidebar-social-link"
              href={githubHref}
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
          ) : null}
          {xHref ? (
            <a
              className="sidebar-social-link"
              href={xHref}
              target="_blank"
              rel="noopener noreferrer"
            >
              X
            </a>
          ) : null}
        </div>
      ) : null}
      <a className="powered-by" href={DOCIA_GITHUB_URL} target="_blank" rel="noopener noreferrer">
        Powered by docsia
      </a>
    </div>
  );
}

function Toc(props: { config: ResolvedConfig; headings: MarkdownHeading[] }): JSX.Element | null {
  const tocHeadings = props.headings.filter(
    (heading) => heading.id && heading.level >= 2 && heading.level <= 3,
  );

  if (tocHeadings.length === 0) {
    return null;
  }

  return (
    <aside className="toc">
      <h2>On this page</h2>
      <ul>
        {tocHeadings.map((heading) => (
          <li className={`toc-item toc-level-${heading.level}`} key={`${heading.level}-${heading.id}`}>
            <a href={toBasePathHref(props.config.basePath, `#${heading.id ?? ""}`)}>
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </aside>
  );
}

function Pagination(props: {
  config: ResolvedConfig;
  graph: SummaryGraph;
  chapter: SummaryChapterEntry;
}): JSX.Element | null {
  const previousChapter = getChapterById(props.graph, props.chapter.previousChapterId);
  const nextChapter = getChapterById(props.graph, props.chapter.nextChapterId);

  if (!previousChapter && !nextChapter) {
    return null;
  }

  return (
    <nav className="pager">
      {previousChapter ? (
        <a className="pager-link" href={toBasePathHref(props.config.basePath, previousChapter.routePath)}>
          <span>Previous</span>
          <strong>{previousChapter.title}</strong>
        </a>
      ) : (
        <span className="pager-spacer"></span>
      )}
      {nextChapter ? (
        <a className="pager-link" href={toBasePathHref(props.config.basePath, nextChapter.routePath)}>
          <span>Next</span>
          <strong>{nextChapter.title}</strong>
        </a>
      ) : (
        <span className="pager-spacer"></span>
      )}
    </nav>
  );
}

function Head(props: {
  config: ResolvedConfig;
  chapter: SummaryChapterEntry;
  pageDescription: string;
  assets: RenderAssetManifest;
}): JSX.Element {
  const siteTitle = props.config.site.title;
  const pageTitle = `${props.chapter.title} - ${siteTitle}`;
  const canonical = resolveCanonicalUrl(props.config, props.chapter.routePath);
  const description = resolveMetaDescription(props.config, props.pageDescription);

  const searchIndexHref = toBasePathHref(props.config.basePath, "/search-index.json");
  const llmsHref = toBasePathHref(props.config.basePath, "/llms.txt");
  const markdownHref = toBasePathHref(
    props.config.basePath,
    `/${encodePathForHref(`${props.chapter.outputPath}.md`)}`,
  );

  const jsonLd = canonical
    ? toJsonScript({
        "@context": "https://schema.org",
        "@type": "TechArticle",
        headline: props.chapter.title,
        inLanguage: props.config.site.language,
        description: description || undefined,
        isPartOf: {
          "@type": "CreativeWork",
          name: props.config.site.title,
        },
        mainEntityOfPage: canonical,
      })
    : null;

  return (
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>{pageTitle}</title>
      <meta name="generator" content="docia" />
      <meta name="docia-base-path" content={props.config.basePath} />
      <meta name="docia-search-index" content={searchIndexHref} />
      <meta name="docia-markdown-url" content={markdownHref} />
      <meta name="docia-llms-url" content={llmsHref} />
      <meta name="theme-color" content="#0f172a" />
      <meta name="robots" content="index,follow" />
      <meta property="og:type" content="article" />
      <meta property="og:title" content={pageTitle} />
      {description.length > 0 ? <meta name="description" content={description} /> : null}
      {canonical ? <link rel="canonical" href={canonical} /> : null}
      {props.assets.stylesheetHref ? (
        <link rel="stylesheet" href={props.assets.stylesheetHref} />
      ) : null}
      {jsonLd ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      ) : null}
    </head>
  );
}

function CommandOverlay(): JSX.Element {
  return (
    <div id="gd-command-overlay" className="command-overlay" hidden>
      <div className="command-menu" role="dialog" aria-modal="true" aria-label="Search documentation">
        <div className="command-input-row">
          <input
            id="gd-command-input"
            type="search"
            placeholder="Type a command or search docs..."
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <ul id="gd-command-results" className="command-results"></ul>
        <div className="command-footer">
          <span>↑↓ navigate</span>
          <span>Enter open</span>
          <span>Esc close</span>
        </div>
      </div>
    </div>
  );
}

function PageDocument(props: RenderPageLayoutInput): JSX.Element {
  const { config, graph, chapter, contentHtml, headings, pageDescription, assets } = props;

  const markdownHref = toBasePathHref(
    config.basePath,
    `/${encodePathForHref(`${chapter.outputPath}.md`)}`,
  );
  const toc = <Toc config={config} headings={headings} />;
  const hasToc = toc !== null;
  const appClassName = hasToc ? "app" : "app app-no-toc";
  const editUrl = resolveEditUrl(config, chapter);

  return (
    <html lang={config.site.language}>
      <Head config={config} chapter={chapter} pageDescription={pageDescription} assets={assets} />
      <body>
        <div className={appClassName}>
          <aside className="sidebar">
            <p className="brand">{config.site.title}</p>
            <button
              id="gd-command-trigger"
              className="command-trigger"
              type="button"
              aria-haspopup="dialog"
              aria-controls="gd-command-overlay"
              aria-expanded="false"
            >
              <span className="command-trigger-icon" aria-hidden="true">
                ⌘
              </span>
              <span className="command-trigger-label">Search docs</span>
            </button>
            <nav aria-label="Chapters">
              <ul className="summary-list">
                {graph.entries.map((entry) => (
                  <SidebarEntry
                    key={entry.id}
                    entry={entry}
                    config={config}
                    activeChapterId={chapter.id}
                  />
                ))}
              </ul>
            </nav>
            {renderSidebarFooter(config)}
          </aside>

          <main className="content">
            <header className="content-header">
              <div className="content-header-row">
                <small>{config.site.title}</small>
                <div className="page-actions">
                  {editUrl ? (
                    <a className="page-edit-link" href={editUrl} target="_blank" rel="noopener noreferrer">
                      Edit file
                    </a>
                  ) : null}
                  <div className="page-ai-split">
                    <button id="gd-page-copy-trigger" className="page-ai-copy" type="button">
                      Copy markdown
                    </button>
                    <button
                      id="gd-page-ai-trigger"
                      className="page-ai-chevron"
                      type="button"
                      aria-haspopup="menu"
                      aria-controls="gd-page-ai-menu"
                      aria-expanded="false"
                      aria-label="More markdown actions"
                    >
                      ▾
                    </button>
                  </div>
                  <div id="gd-page-ai-menu" className="page-ai-menu" role="menu" hidden>
                    <a
                      className="page-ai-menu-item"
                      href={markdownHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-ai-action="view-markdown"
                      role="menuitem"
                    >
                      View markdown
                    </a>
                    <a
                      className="page-ai-menu-item"
                      href="#"
                      target="_blank"
                      rel="noopener noreferrer"
                      data-ai-action="open-chatgpt"
                      role="menuitem"
                    >
                      Open in ChatGPT
                    </a>
                    <a
                      className="page-ai-menu-item"
                      href="#"
                      target="_blank"
                      rel="noopener noreferrer"
                      data-ai-action="open-claude"
                      role="menuitem"
                    >
                      Open in Claude
                    </a>
                  </div>
                </div>
              </div>
            </header>

            <article className="markdown" dangerouslySetInnerHTML={{ __html: contentHtml }} />
            <Pagination config={config} graph={graph} chapter={chapter} />
          </main>
          {toc}
        </div>

        <CommandOverlay />
        {assets.scriptHref ? <script type="module" src={assets.scriptHref}></script> : null}
      </body>
    </html>
  );
}

export function renderPageLayout(input: RenderPageLayoutInput): string {
  return `<!doctype html>${renderToStaticMarkup(<PageDocument {...input} />)}`;
}
