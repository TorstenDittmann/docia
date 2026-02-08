import type { JSX } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { SummaryChapterEntry, SummaryEntry, SummaryGraph, SummaryLinkEntry } from "../book";
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

function IconGithub(): JSX.Element {
	return (
		<svg className="inline-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
			<path
				fill="currentColor"
				d="M12 .5a11.5 11.5 0 0 0-3.64 22.42c.57.1.78-.25.78-.56l-.01-2.18c-3.17.7-3.84-1.35-3.84-1.35a3 3 0 0 0-1.27-1.67c-1.04-.71.08-.7.08-.7a2.4 2.4 0 0 1 1.75 1.18 2.45 2.45 0 0 0 3.35.96c.05-.62.3-1.2.72-1.66-2.53-.29-5.2-1.27-5.2-5.63a4.39 4.39 0 0 1 1.17-3.05 4.1 4.1 0 0 1 .11-3.01s.96-.31 3.14 1.17a10.86 10.86 0 0 1 5.72 0c2.18-1.48 3.14-1.17 3.14-1.17.4.95.45 2 .11 3.01a4.39 4.39 0 0 1 1.17 3.05c0 4.37-2.67 5.34-5.22 5.62a2.72 2.72 0 0 1 .77 2.11l-.01 3.12c0 .31.21.67.79.56A11.5 11.5 0 0 0 12 .5Z"
			/>
		</svg>
	);
}

function IconX(): JSX.Element {
	return (
		<svg className="inline-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
			<path
				fill="currentColor"
				d="M14.1 10.2 21.6 1.5h-1.8l-6.5 7.6-5.1-7.6H2.5l7.8 11.6-7.8 9h1.8l6.9-8 5.3 8h5.7l-8.1-12Z"
			/>
		</svg>
	);
}

function IconMarkdown(): JSX.Element {
	return (
		<svg className="inline-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
			<path
				fill="currentColor"
				d="M22.27 19.385H1.73A1.73 1.73 0 0 1 0 17.655V6.345a1.73 1.73 0 0 1 1.73-1.73h20.54A1.73 1.73 0 0 1 24 6.345v11.308a1.73 1.73 0 0 1-1.73 1.731zM5.769 15.923v-4.5l2.308 2.885l2.307-2.885v4.5h2.308V8.078h-2.308l-2.307 2.885l-2.308-2.885H3.46v7.847zM21.232 12h-2.309V8.077h-2.307V12h-2.308l3.461 4.039z"
			/>
		</svg>
	);
}

function IconOpenAI(): JSX.Element {
	return (
		<svg className="inline-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
			<path
				fill="currentColor"
				d="M22.282 9.821a6 6 0 0 0-.516-4.91a6.05 6.05 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a6 6 0 0 0-3.998 2.9a6.05 6.05 0 0 0 .743 7.097a5.98 5.98 0 0 0 .51 4.911a6.05 6.05 0 0 0 6.515 2.9A6 6 0 0 0 13.26 24a6.06 6.06 0 0 0 5.772-4.206a6 6 0 0 0 3.997-2.9a6.06 6.06 0 0 0-.747-7.073M13.26 22.43a4.48 4.48 0 0 1-2.876-1.04l.141-.081l4.779-2.758a.8.8 0 0 0 .392-.681v-6.737l2.02 1.168a.07.07 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494M3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085l4.783 2.759a.77.77 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646M2.34 7.896a4.5 4.5 0 0 1 2.366-1.973V11.6a.77.77 0 0 0 .388.677l5.815 3.354l-2.02 1.168a.08.08 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.08.08 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667m2.01-3.023l-.141-.085l-4.774-2.782a.78.78 0 0 0-.785 0L9.409 9.23V6.897a.07.07 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.8.8 0 0 0-.393.681zm1.097-2.365l2.602-1.5l2.607 1.5v2.999l-2.597 1.5l-2.607-1.5Z"
			/>
		</svg>
	);
}

function IconClaude(): JSX.Element {
	return (
		<svg className="inline-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
			<path
				fill="currentColor"
				d="m4.714 15.956l4.718-2.648l.079-.23l-.08-.128h-.23l-.79-.048l-2.695-.073l-2.337-.097l-2.265-.122l-.57-.121l-.535-.704l.055-.353l.48-.321l.685.06l1.518.104l2.277.157l1.651.098l2.447.255h.389l.054-.158l-.133-.097l-.103-.098l-2.356-1.596l-2.55-1.688l-1.336-.972l-.722-.491L2 6.223l-.158-1.008l.656-.722l.88.06l.224.061l.893.686l1.906 1.476l2.49 1.833l.364.304l.146-.104l.018-.072l-.164-.274l-1.354-2.446l-1.445-2.49l-.644-1.032l-.17-.619a3 3 0 0 1-.103-.729L6.287.133L6.7 0l.995.134l.42.364l.619 1.415L9.735 4.14l1.555 3.03l.455.898l.243.832l.09.255h.159V9.01l.127-1.706l.237-2.095l.23-2.695l.08-.76l.376-.91l.747-.492l.583.28l.48.685l-.067.444l-.286 1.851l-.558 2.903l-.365 1.942h.213l.243-.242l.983-1.306l1.652-2.064l.728-.82l.85-.904l.547-.431h1.032l.759 1.129l-.34 1.166l-1.063 1.347l-.88 1.142l-1.263 1.7l-.79 1.36l.074.11l.188-.02l2.853-.606l1.542-.28l1.84-.315l.832.388l.09.395l-.327.807l-1.967.486l-2.307.462l-3.436.813l-.043.03l.049.061l1.548.146l.662.036h1.62l3.018.225l.79.522l.473.638l-.08.485l-1.213.62l-1.64-.389l-3.825-.91l-1.31-.329h-.183v.11l1.093 1.068l2.003 1.81l2.508 2.33l.127.578l-.321.455l-.34-.049l-2.204-1.657l-.85-.747l-1.925-1.62h-.127v.17l.443.649l2.343 3.521l.122 1.08l-.17.353l-.607.213l-.668-.122l-1.372-1.924l-1.415-2.168l-1.141-1.943l-.14.08l-.674 7.254l-.316.37l-.728.28l-.607-.461l-.322-.747l.322-1.476l.388-1.924l.316-1.53l.285-1.9l.17-.632l-.012-.042l-.14.018l-1.432 1.967l-2.18 2.945l-1.724 1.845l-.413.164l-.716-.37l.066-.662l.401-.589l2.386-3.036l1.439-1.882l.929-1.086l-.006-.158h-.055L4.138 18.56l-1.13.146l-.485-.456l.06-.746l.231-.243l1.907-1.312Z"
			/>
		</svg>
	);
}

function IconEdit(): JSX.Element {
	return (
		<svg className="inline-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
			<path
				fill="currentColor"
				d="M3 17.25V21h3.75L18.06 9.69l-3.75-3.75L3 17.25Zm2 2.75v-1.9l9.31-9.31 1.9 1.9L6.9 20H5ZM20.71 7.04a1 1 0 0 0 0-1.42L18.37 3.3a1 1 0 0 0-1.42 0l-1.13 1.13 3.75 3.75 1.14-1.14Z"
			/>
		</svg>
	);
}

function IconCopy(): JSX.Element {
	return (
		<svg className="inline-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
			<path
				fill="currentColor"
				d="M16 1H6a2 2 0 0 0-2 2v12h2V3h10V1Zm3 4H10a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H10V7h9v14Z"
			/>
		</svg>
	);
}

function getChapterById(graph: SummaryGraph, chapterId: string | null): SummaryChapterEntry | null {
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

function resolveAbsoluteUrl(config: ResolvedConfig, href: string): string | null {
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

function resolveEditUrl(config: ResolvedConfig, chapter: SummaryChapterEntry): string | null {
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
							<IconGithub />
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
							<IconX />X
						</a>
					) : null}
				</div>
			) : null}
			<a
				className="powered-by"
				href={DOCIA_GITHUB_URL}
				target="_blank"
				rel="noopener noreferrer"
			>
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
					<li
						className={`toc-item toc-level-${heading.level}`}
						key={`${heading.level}-${heading.id}`}
					>
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
				<a
					className="pager-link"
					href={toBasePathHref(props.config.basePath, previousChapter.routePath)}
				>
					<span>Previous</span>
					<strong>{previousChapter.title}</strong>
				</a>
			) : (
				<span className="pager-spacer"></span>
			)}
			{nextChapter ? (
				<a
					className="pager-link"
					href={toBasePathHref(props.config.basePath, nextChapter.routePath)}
				>
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
	const ogImageHref = toBasePathHref(props.config.basePath, props.config.site.ogImage);
	const ogImageUrl = resolveAbsoluteUrl(props.config, ogImageHref) ?? ogImageHref;

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
			<meta property="og:site_name" content={siteTitle} />
			<meta property="og:title" content={pageTitle} />
			<meta property="og:image" content={ogImageUrl} />
			<meta name="twitter:card" content="summary_large_image" />
			<meta name="twitter:title" content={pageTitle} />
			<meta name="twitter:image" content={ogImageUrl} />
			{description.length > 0 ? <meta name="description" content={description} /> : null}
			{description.length > 0 ? (
				<meta property="og:description" content={description} />
			) : null}
			{description.length > 0 ? (
				<meta name="twitter:description" content={description} />
			) : null}
			<link
				rel="icon"
				type="image/svg+xml"
				href={toBasePathHref(props.config.basePath, "/favicon.svg")}
			/>
			{canonical ? <link rel="canonical" href={canonical} /> : null}
			{canonical ? <meta property="og:url" content={canonical} /> : null}
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
			<div
				className="command-menu"
				role="dialog"
				aria-modal="true"
				aria-label="Search documentation"
			>
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
			<Head
				config={config}
				chapter={chapter}
				pageDescription={pageDescription}
				assets={assets}
			/>
			<body>
				<div className={appClassName}>
					<aside className="sidebar">
						<div className="sidebar-top">
							<p className="brand">{config.site.title}</p>
							<button
								id="gd-mobile-nav-toggle"
								className="mobile-nav-toggle"
								type="button"
								aria-expanded="false"
								aria-controls="gd-mobile-nav-panel"
							>
								<svg
									className="mobile-nav-icon"
									viewBox="0 0 24 24"
									aria-hidden="true"
									focusable="false"
								>
									<path
										fill="currentColor"
										d="M4 6.5h16v2H4zm0 4.5h16v2H4zm0 4.5h16v2H4z"
									/>
								</svg>
								Menu
							</button>
						</div>
						<div id="gd-mobile-nav-panel" className="mobile-nav-panel">
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
						</div>
					</aside>

					<main className="content">
						<header className="content-header">
							<div className="content-header-row">
								<small>{config.site.title}</small>
								<div className="page-actions">
									{editUrl ? (
										<a
											className="page-edit-link"
											href={editUrl}
											target="_blank"
											rel="noopener noreferrer"
										>
											<IconEdit />
											Edit file
										</a>
									) : null}
									<div className="page-ai-split">
										<button
											id="gd-page-copy-trigger"
											className="page-ai-copy"
											type="button"
										>
											<IconCopy />
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
									<div
										id="gd-page-ai-menu"
										className="page-ai-menu"
										role="menu"
										hidden
									>
										<a
											className="page-ai-menu-item"
											href={markdownHref}
											target="_blank"
											rel="noopener noreferrer"
											data-ai-action="view-markdown"
											role="menuitem"
										>
											<IconMarkdown />
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
											<IconOpenAI />
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
											<IconClaude />
											Open in Claude
										</a>
									</div>
								</div>
							</div>
						</header>

						<article
							className="markdown"
							dangerouslySetInnerHTML={{ __html: contentHtml }}
						/>
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
