import type { CSSProperties, JSX } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { ResolvedConfig } from "../config/types";
import { toBasePathHref } from "../utils/html";
import type { RenderAssetManifest } from "./layout";

function resolveAssetHref(config: ResolvedConfig, href: string): string {
	return /^(?:[a-zA-Z][a-zA-Z0-9+.-]*:|\/\/)/.test(href)
		? href
		: toBasePathHref(config.basePath, href);
}

function pageStyles(config: ResolvedConfig, assets: RenderAssetManifest): JSX.Element[] {
	const links: JSX.Element[] = [];
	if (assets.stylesheetHref) {
		links.push(<link key="docia" rel="stylesheet" href={assets.stylesheetHref} />);
	}
	for (const href of config.theme.customCss) {
		links.push(<link key={href} rel="stylesheet" href={resolveAssetHref(config, href)} />);
	}
	return links;
}

function htmlProps(config: ResolvedConfig): {
	"data-default-theme": string;
	"data-theme": string;
	lang: string;
	style?: CSSProperties;
} {
	return {
		lang: config.site.language,
		"data-theme": config.theme.colorMode,
		"data-default-theme": config.theme.colorMode,
		style:
			config.theme.accentColor.length > 0
				? ({ "--docia-accent": config.theme.accentColor } as CSSProperties)
				: undefined,
	};
}

export function renderRedirectPage(
	config: ResolvedConfig,
	assets: RenderAssetManifest,
	targetRoutePath: string,
): string {
	const targetHref = toBasePathHref(config.basePath, targetRoutePath);
	const absoluteTarget = (() => {
		try {
			return config.site.url.length > 0
				? new URL(targetHref, config.site.url).toString()
				: targetHref;
		} catch {
			return targetHref;
		}
	})();
	const redirectScript = `location.replace(${JSON.stringify(targetHref).replace(/</g, "\\u003c")});`;

	const document = (
		<html {...htmlProps(config)}>
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<meta name="robots" content="noindex,follow" />
				<meta httpEquiv="refresh" content={`0; url=${targetHref}`} />
				<link rel="canonical" href={absoluteTarget} />
				<title>{`Redirecting - ${config.site.title}`}</title>
				{pageStyles(config, assets)}
			</head>
			<body>
				<main className="special-page">
					<p className="special-page-kicker">Moved</p>
					<h1>This page has moved</h1>
					<p>
						Continue to <a href={targetHref}>{targetHref}</a>.
					</p>
				</main>
				<script dangerouslySetInnerHTML={{ __html: redirectScript }} />
			</body>
		</html>
	);

	return `<!doctype html>${renderToStaticMarkup(document)}`;
}

export function renderNotFoundPage(config: ResolvedConfig, assets: RenderAssetManifest): string {
	const homeHref = toBasePathHref(config.basePath, "/");
	const document = (
		<html {...htmlProps(config)}>
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<meta name="robots" content="noindex,nofollow" />
				<title>{`Page not found - ${config.site.title}`}</title>
				{config.theme.favicon.length > 0 ? (
					<link rel="icon" href={resolveAssetHref(config, config.theme.favicon)} />
				) : null}
				{pageStyles(config, assets)}
			</head>
			<body>
				<main className="special-page">
					<p className="special-page-kicker">404</p>
					<h1>Page not found</h1>
					<p>The page may have moved, or the address may be incorrect.</p>
					<a className="special-page-action" href={homeHref}>
						Back to {config.site.title}
					</a>
				</main>
			</body>
		</html>
	);

	return `<!doctype html>${renderToStaticMarkup(document)}`;
}
