import { posix } from "node:path";
import { CliError } from "../errors";

export interface PageLocation {
	routePath: string;
	outputPath: string;
}

const MARKDOWN_PATH_PATTERN = /\.(md|markdown|mdown)$/i;

function stripMarkdownExtension(pathValue: string): string {
	return pathValue.replace(MARKDOWN_PATH_PATTERN, "");
}

function trimReadmeSuffix(pathValue: string): string {
	return pathValue.replace(/(?:^|\/)README$/i, "");
}

function locationFromCleanPath(cleaned: string, prettyUrls: boolean): PageLocation {
	if (prettyUrls) {
		if (cleaned.length === 0) {
			return { routePath: "/", outputPath: "index.html" };
		}

		return {
			routePath: `/${cleaned}/`,
			outputPath: `${cleaned}/index.html`,
		};
	}

	if (cleaned.length === 0) {
		return { routePath: "/index.html", outputPath: "index.html" };
	}

	return {
		routePath: `/${cleaned}.html`,
		outputPath: `${cleaned}.html`,
	};
}

function normalizeSlug(slug: string, label: string): string {
	const trimmed = slug.trim();
	if (trimmed.length === 0) {
		throw new CliError(`Invalid ${label}: path cannot be empty.`);
	}
	if (
		/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed) ||
		trimmed.includes("?") ||
		trimmed.includes("#")
	) {
		throw new CliError(
			`Invalid ${label} \`${slug}\`: expected a URL path without query or hash.`,
		);
	}
	if (trimmed.includes("\\")) {
		throw new CliError(`Invalid ${label} \`${slug}\`: use forward slashes in URL paths.`);
	}

	const segments = trimmed.split("/").filter((segment) => segment.length > 0);
	if (segments.some((segment) => segment === "." || segment === "..")) {
		throw new CliError(`Invalid ${label} \`${slug}\`: path traversal is not allowed.`);
	}
	if (segments.some((segment) => segment.toLowerCase().endsWith(".html"))) {
		throw new CliError(`Invalid ${label} \`${slug}\`: omit the \`.html\` extension.`);
	}

	const normalized = posix.normalize(`/${segments.join("/")}`);
	return normalized === "/" ? "" : normalized.replace(/^\/+|\/+$/g, "");
}

export function resolveChapterLocation(
	sourcePath: string,
	prettyUrls: boolean,
	slug?: string,
): PageLocation {
	if (slug !== undefined) {
		return locationFromCleanPath(normalizeSlug(slug, "front matter slug"), prettyUrls);
	}

	const normalized = stripMarkdownExtension(sourcePath);
	const withoutReadme = trimReadmeSuffix(normalized);
	const cleaned = withoutReadme.replace(/^\/+|\/+$/g, "");
	return locationFromCleanPath(cleaned, prettyUrls);
}

export function resolveRedirectLocation(redirectFrom: string, prettyUrls: boolean): PageLocation {
	return locationFromCleanPath(normalizeSlug(redirectFrom, "redirect path"), prettyUrls);
}
