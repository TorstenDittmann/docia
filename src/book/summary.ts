import { posix, resolve } from "node:path";
import type { ResolvedConfig } from "../config/types";
import { CliError } from "../errors";
import type {
	SummaryChapterEntry,
	SummaryEntry,
	SummaryGraph,
	SummaryLinkEntry,
	SummarySectionEntry,
} from "./types";

const MARKDOWN_PATH_PATTERN = /\.(md|markdown|mdown)$/i;
const LIST_ITEM_PATTERN = /^(\s*)[-*+]\s+(.+)$/;
const MARKDOWN_LINK_PATTERN = /^\[([^\]]+)\]\((.+)\)\s*$/;
const EXTERNAL_LINK_PATTERN = /^(?:[a-zA-Z][a-zA-Z0-9+.-]*:|#|\/\/)/;

interface ParsedSummaryItem {
	indentWidth: number;
	line: number;
	title: string;
	href?: string;
}

interface EntryStackItem {
	depth: number;
	entry: SummaryEntry;
}

function toLeadingSpaces(input: string): string {
	return input.replaceAll("\t", "  ");
}

function parseSummaryItems(text: string): ParsedSummaryItem[] {
	const lines = text.split(/\r?\n/);
	const items: ParsedSummaryItem[] = [];

	for (let index = 0; index < lines.length; index += 1) {
		const line = lines[index];
		const match = LIST_ITEM_PATTERN.exec(line ?? "");
		if (!match) {
			continue;
		}

		const indent = toLeadingSpaces(match[1] ?? "");
		const raw = (match[2] ?? "").trim();
		if (raw.length === 0) {
			continue;
		}

		const indentWidth = indent.length;
		const linkMatch = MARKDOWN_LINK_PATTERN.exec(raw);
		if (linkMatch) {
			const title = (linkMatch[1] ?? "").trim();
			const href = (linkMatch[2] ?? "").trim();

			if (title.length === 0) {
				throw new CliError(`Invalid SUMMARY entry at line ${index + 1}: missing title.`);
			}
			if (href.length === 0) {
				throw new CliError(`Invalid SUMMARY entry at line ${index + 1}: missing href.`);
			}

			items.push({
				indentWidth,
				line: index + 1,
				title,
				href,
			});

			continue;
		}

		items.push({
			indentWidth,
			line: index + 1,
			title: raw,
		});
	}

	return items;
}

function normalizeSourcePath(href: string, line: number): string {
	const trimmed = href.trim();
	const withoutHash = trimmed.split("#", 1)[0] ?? "";
	const withoutQuery = withoutHash.split("?", 1)[0] ?? "";

	let normalized = withoutQuery.replaceAll("\\", "/").replace(/^\.?\//, "");
	if (normalized.startsWith("/")) {
		normalized = normalized.slice(1);
	}

	normalized = posix.normalize(normalized);

	if (normalized.length === 0 || normalized === ".") {
		throw new CliError(`Invalid SUMMARY link at line ${line}: empty file path.`);
	}

	if (normalized === ".." || normalized.startsWith("../")) {
		throw new CliError(
			`Invalid SUMMARY link at line ${line}: path cannot traverse outside source dir.`,
		);
	}

	return normalized;
}

function escapeRegExp(input: string): string {
	return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripMarkdownExtension(pathValue: string): string {
	return pathValue.replace(MARKDOWN_PATH_PATTERN, "");
}

function trimReadmeSuffix(pathValue: string): string {
	const readmePattern = new RegExp(`(?:^|/)${escapeRegExp("README")}$`, "i");
	return pathValue.replace(readmePattern, "");
}

function toRoutePath(sourcePath: string, prettyUrls: boolean): string {
	const normalized = stripMarkdownExtension(sourcePath);
	const withoutReadme = trimReadmeSuffix(normalized);
	const cleaned = withoutReadme.replace(/^\//, "").replace(/\/$/, "");

	if (prettyUrls) {
		if (cleaned.length === 0) {
			return "/";
		}

		return `/${cleaned}/`;
	}

	if (cleaned.length === 0) {
		return "/index.html";
	}

	return `/${cleaned}.html`;
}

function toOutputPath(sourcePath: string, prettyUrls: boolean): string {
	const normalized = stripMarkdownExtension(sourcePath);
	const withoutReadme = trimReadmeSuffix(normalized);
	const cleaned = withoutReadme.replace(/^\//, "").replace(/\/$/, "");

	if (prettyUrls) {
		if (cleaned.length === 0) {
			return "index.html";
		}

		return `${cleaned}/index.html`;
	}

	if (cleaned.length === 0) {
		return "index.html";
	}

	return `${cleaned}.html`;
}

function createEntryId(prefix: string, line: number): string {
	return `${prefix}-${line}`;
}

function isExternalLink(href: string): boolean {
	return EXTERNAL_LINK_PATTERN.test(href.trim());
}

function isMarkdownHref(href: string): boolean {
	const pathPart = href.split("#", 1)[0]?.split("?", 1)[0] ?? "";
	return MARKDOWN_PATH_PATTERN.test(pathPart);
}

function flattenChapters(entries: SummaryEntry[]): SummaryChapterEntry[] {
	const chapters: SummaryChapterEntry[] = [];

	const visit = (entryList: SummaryEntry[]): void => {
		for (const entry of entryList) {
			if (entry.kind === "chapter") {
				chapters.push(entry);
			}

			if (entry.children.length > 0) {
				visit(entry.children);
			}
		}
	};

	visit(entries);
	return chapters;
}

export async function loadSummaryGraph(config: ResolvedConfig): Promise<SummaryGraph> {
	const summaryPath = resolve(config.srcDirAbsolute, "SUMMARY.md");
	const summaryFile = Bun.file(summaryPath);

	if (!(await summaryFile.exists())) {
		throw new CliError(
			`Could not find SUMMARY.md in source directory: ${config.srcDirAbsolute}`,
		);
	}

	const summaryText = await summaryFile.text();
	const items = parseSummaryItems(summaryText);

	if (items.length === 0) {
		throw new CliError(`SUMMARY.md does not include any chapter entries: ${summaryPath}`);
	}

	const rootEntries: SummaryEntry[] = [];
	const stack: EntryStackItem[] = [];
	const entryById = new Map<string, SummaryEntry>();
	const chapterBySourcePath = new Map<string, SummaryChapterEntry>();

	for (const item of items) {
		while (stack.length > 0) {
			const top = stack[stack.length - 1];
			if (top && top.depth >= item.indentWidth) {
				stack.pop();
				continue;
			}

			break;
		}

		const parent = stack[stack.length - 1]?.entry;
		if (!parent && item.indentWidth > 0) {
			throw new CliError(
				`Invalid SUMMARY nesting at line ${item.line}: indentation starts before a parent entry.`,
			);
		}

		const depth = parent ? parent.depth + 1 : 0;

		let entry: SummaryEntry;

		if (item.href === undefined) {
			const sectionEntry: SummarySectionEntry = {
				id: createEntryId("section", item.line),
				kind: "section",
				title: item.title,
				depth,
				line: item.line,
				parentId: parent?.id ?? null,
				children: [],
			};
			entry = sectionEntry;
		} else if (isExternalLink(item.href) || !isMarkdownHref(item.href)) {
			const linkEntry: SummaryLinkEntry = {
				id: createEntryId("link", item.line),
				kind: "link",
				title: item.title,
				href: item.href,
				external: isExternalLink(item.href),
				depth,
				line: item.line,
				parentId: parent?.id ?? null,
				children: [],
			};
			entry = linkEntry;
		} else {
			const sourcePath = normalizeSourcePath(item.href, item.line);
			const sourceAbsolutePath = resolve(config.srcDirAbsolute, sourcePath);

			if (chapterBySourcePath.has(sourcePath)) {
				const existing = chapterBySourcePath.get(sourcePath);
				throw new CliError(
					`Duplicate SUMMARY chapter path \`${sourcePath}\` at line ${item.line}. First defined at line ${existing?.line}.`,
				);
			}

			const chapterEntry: SummaryChapterEntry = {
				id: createEntryId("chapter", item.line),
				kind: "chapter",
				title: item.title,
				href: item.href,
				sourcePath,
				sourceAbsolutePath,
				routePath: toRoutePath(sourcePath, config.prettyUrls),
				outputPath: toOutputPath(sourcePath, config.prettyUrls),
				depth,
				line: item.line,
				parentId: parent?.id ?? null,
				children: [],
				order: -1,
				previousChapterId: null,
				nextChapterId: null,
			};

			chapterBySourcePath.set(sourcePath, chapterEntry);
			entry = chapterEntry;
		}

		if (parent) {
			parent.children.push(entry);
		} else {
			rootEntries.push(entry);
		}

		entryById.set(entry.id, entry);
		stack.push({ depth: item.indentWidth, entry });
	}

	const chapters = flattenChapters(rootEntries);
	chapters.forEach((chapter, index) => {
		const previous = chapters[index - 1];
		const next = chapters[index + 1];

		chapter.order = index;
		chapter.previousChapterId = previous?.id ?? null;
		chapter.nextChapterId = next?.id ?? null;
	});

	return {
		summaryPath,
		entries: rootEntries,
		chapters,
		chapterBySourcePath,
		entryById,
		firstChapterId: chapters[0]?.id ?? null,
		lastChapterId: chapters[chapters.length - 1]?.id ?? null,
	};
}
