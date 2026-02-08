import { readdir } from "node:fs/promises";
import { dirname, posix, resolve } from "node:path";
import type { CommandContext } from "../cli-types";
import { loadSummaryGraph } from "../book";
import { loadConfig } from "../config/load-config";
import { readStringFlag } from "../utils/args";

const MARKDOWN_FILE_PATTERN = /\.(md|markdown|mdown)$/i;
const MARKDOWN_LINK_PATTERN = /!?\[[^\]]*\]\(([^)]+)\)/g;
const EXTERNAL_LINK_PATTERN = /^(?:[a-zA-Z][a-zA-Z0-9+.-]*:|#|\/\/)/;

interface ChapterIssue {
	chapterPath: string;
	issue: string;
}

function normalizeSourcePathFromHref(sourcePath: string, href: string): string | null {
	const trimmed = href.trim().replace(/^<|>$/g, "");
	if (trimmed.length === 0 || EXTERNAL_LINK_PATTERN.test(trimmed)) {
		return null;
	}

	const withoutHash = trimmed.split("#", 1)[0] ?? "";
	const withoutQuery = withoutHash.split("?", 1)[0] ?? "";
	if (!MARKDOWN_FILE_PATTERN.test(withoutQuery)) {
		return null;
	}

	const normalizedHref = withoutQuery.replaceAll("\\", "/");
	const fromDir = dirname(sourcePath).replaceAll("\\", "/");
	const joined = normalizedHref.startsWith("/")
		? normalizedHref.slice(1)
		: posix.join(fromDir === "." ? "" : fromDir, normalizedHref);

	const normalized = posix.normalize(joined);
	if (normalized === ".." || normalized.startsWith("../")) {
		return null;
	}

	return normalized;
}

async function collectMarkdownFiles(rootDir: string, startRelativePath = ""): Promise<string[]> {
	const absoluteDirectory =
		startRelativePath.length === 0 ? rootDir : resolve(rootDir, startRelativePath);
	const entries = await readdir(absoluteDirectory, { withFileTypes: true });
	const files: string[] = [];

	for (const entry of entries) {
		const relativePath =
			startRelativePath.length === 0
				? entry.name
				: posix.join(startRelativePath.replaceAll("\\", "/"), entry.name);

		if (entry.isDirectory()) {
			files.push(...(await collectMarkdownFiles(rootDir, relativePath)));
			continue;
		}

		if (entry.isFile() && MARKDOWN_FILE_PATTERN.test(entry.name)) {
			files.push(relativePath.replaceAll("\\", "/"));
		}
	}

	return files;
}

function formatIssue(issue: ChapterIssue): string {
	return `- ${issue.chapterPath}: ${issue.issue}`;
}

function stripCodeFromMarkdown(markdown: string): string {
	return markdown
		.replace(/```[\s\S]*?```/g, "\n")
		.replace(/~~~[\s\S]*?~~~/g, "\n")
		.replace(/`[^`\n]*`/g, "");
}

function printCheckHelp(): void {
	console.log("Usage: docia check [--config <path>]");
	console.log("");
	console.log("Validate docs structure and links.");
}

export async function runCheckCommand(context: CommandContext): Promise<number> {
	const configFlag = readStringFlag(context.flags, "config", "c");
	const loaded = await loadConfig({ cwd: context.cwd, configFile: configFlag });
	const graph = await loadSummaryGraph(loaded.config);

	const issues: string[] = [];

	const missingChapters: string[] = [];
	for (const chapter of graph.chapters) {
		const exists = await Bun.file(chapter.sourceAbsolutePath).exists();
		if (!exists) {
			missingChapters.push(chapter.sourcePath);
		}
	}

	if (missingChapters.length > 0) {
		issues.push("Missing chapter files referenced by SUMMARY.md:");
		for (const sourcePath of missingChapters) {
			issues.push(`- ${sourcePath}`);
		}
	}

	const routeToChapter = new Map<string, string>();
	for (const chapter of graph.chapters) {
		const existing = routeToChapter.get(chapter.routePath);
		if (existing !== undefined && existing !== chapter.sourcePath) {
			issues.push(
				`Duplicate route path \`${chapter.routePath}\` for chapters \`${existing}\` and \`${chapter.sourcePath}\`.`,
			);
			continue;
		}

		routeToChapter.set(chapter.routePath, chapter.sourcePath);
	}

	const outputToChapter = new Map<string, string>();
	for (const chapter of graph.chapters) {
		const existing = outputToChapter.get(chapter.outputPath);
		if (existing !== undefined && existing !== chapter.sourcePath) {
			issues.push(
				`Duplicate output path \`${chapter.outputPath}\` for chapters \`${existing}\` and \`${chapter.sourcePath}\`.`,
			);
			continue;
		}

		outputToChapter.set(chapter.outputPath, chapter.sourcePath);
	}

	const linkIssues: ChapterIssue[] = [];
	for (const chapter of graph.chapters) {
		const markdown = await Bun.file(chapter.sourceAbsolutePath).text();
		const markdownForLinkScan = stripCodeFromMarkdown(markdown);
		MARKDOWN_LINK_PATTERN.lastIndex = 0;

		const visitedTargets = new Set<string>();
		let match: RegExpExecArray | null;
		while ((match = MARKDOWN_LINK_PATTERN.exec(markdownForLinkScan)) !== null) {
			const rawTarget = match[1] ?? "";
			const normalizedTarget = normalizeSourcePathFromHref(chapter.sourcePath, rawTarget);
			if (!normalizedTarget) {
				continue;
			}

			if (visitedTargets.has(normalizedTarget)) {
				continue;
			}
			visitedTargets.add(normalizedTarget);

			const targetAbsolutePath = resolve(loaded.config.srcDirAbsolute, normalizedTarget);
			const targetExists = await Bun.file(targetAbsolutePath).exists();
			if (!targetExists) {
				linkIssues.push({
					chapterPath: chapter.sourcePath,
					issue: `links to missing markdown file \`${normalizedTarget}\``,
				});
			}
		}
	}

	if (linkIssues.length > 0) {
		issues.push("Broken markdown links:");
		for (const issue of linkIssues) {
			issues.push(formatIssue(issue));
		}
	}

	const markdownFiles = await collectMarkdownFiles(loaded.config.srcDirAbsolute);
	const knownPaths = new Set(graph.chapters.map((chapter) => chapter.sourcePath));
	const orphanChapters = markdownFiles
		.filter((filePath) => filePath.toLowerCase() !== "summary.md")
		.filter((filePath) => !knownPaths.has(filePath));

	if (orphanChapters.length > 0) {
		issues.push("Markdown files not referenced by SUMMARY.md:");
		for (const filePath of orphanChapters) {
			issues.push(`- ${filePath}`);
		}
	}

	if (issues.length > 0) {
		console.error("Check failed.");
		for (const issue of issues) {
			console.error(issue);
		}
		return 1;
	}

	console.log("Check completed.");
	console.log(`- Config: ${loaded.config.configFilePath ?? "built-in defaults"}`);
	console.log(`- Source dir: ${loaded.config.srcDirAbsolute}`);
	console.log(`- SUMMARY entries: ${graph.entries.length}`);
	console.log(`- Chapter entries: ${graph.chapters.length}`);
	console.log("- All validations passed.");

	return 0;
}

export { printCheckHelp };
