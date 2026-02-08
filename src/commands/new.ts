import { mkdir } from "node:fs/promises";
import { basename, dirname, relative, resolve, sep } from "node:path";
import type { CommandContext } from "../cli-types";
import { CliError } from "../errors";
import { loadConfig } from "../config/load-config";
import { readBooleanFlag, readStringFlag } from "../utils/args";
import { slugify, toTitleCaseFromName } from "../utils/strings";

function printNewHelp(): void {
	console.log("Usage: docia new <chapter-name> [--title <name>] [--force]");
	console.log("");
	console.log("Create a new markdown chapter in your source directory.");
}

function normalizeChapterPath(rawInput: string): string {
	const trimmed = rawInput.trim();
	if (trimmed.length === 0) {
		throw new CliError("Please provide a chapter name.");
	}

	if (trimmed.endsWith(".md")) {
		return trimmed;
	}

	const segments = trimmed
		.split("/")
		.map((segment) => segment.trim())
		.filter((segment) => segment.length > 0)
		.map((segment) => slugify(segment));

	if (segments.length === 0) {
		throw new CliError("Chapter name resolves to an empty path.");
	}

	return `${segments.join("/")}.md`;
}

function isPathInside(parent: string, child: string): boolean {
	if (child === parent) {
		return true;
	}

	return child.startsWith(`${parent}${sep}`);
}

async function maybeAppendSummaryEntry(
	summaryPath: string,
	title: string,
	chapterPath: string,
): Promise<void> {
	const summaryFile = Bun.file(summaryPath);
	const exists = await summaryFile.exists();
	if (!exists) {
		return;
	}

	const currentContents = await summaryFile.text();
	const normalizedPath = chapterPath.replaceAll("\\", "/");
	const entry = `- [${title}](${normalizedPath})`;

	if (currentContents.includes(entry)) {
		return;
	}

	const needsNewline = currentContents.length > 0 && !currentContents.endsWith("\n");
	const nextContents = `${currentContents}${needsNewline ? "\n" : ""}${entry}\n`;
	await Bun.write(summaryPath, nextContents);
}

export async function runNewCommand(context: CommandContext): Promise<number> {
	const chapterInput = context.positionals[0];
	if (chapterInput === undefined) {
		printNewHelp();
		return 1;
	}

	const force = readBooleanFlag(context.flags, "force", "f");
	const includeInSummary = readBooleanFlag(context.flags, "summary", "s");
	const configFlag = readStringFlag(context.flags, "config", "c");

	const loaded = await loadConfig({ cwd: context.cwd, configFile: configFlag });
	const chapterPath = normalizeChapterPath(chapterInput);
	const absoluteChapterPath = resolve(loaded.config.srcDirAbsolute, chapterPath);

	if (!isPathInside(loaded.config.srcDirAbsolute, absoluteChapterPath)) {
		throw new CliError("Chapter path must stay inside the configured source directory.");
	}

	const chapterExists = await Bun.file(absoluteChapterPath).exists();
	if (chapterExists && !force) {
		throw new CliError(
			`Chapter already exists at \`${chapterPath}\`. Use --force to overwrite it.`,
		);
	}

	const inferredTitle = toTitleCaseFromName(basename(chapterPath));
	const title = readStringFlag(context.flags, "title", "t") ?? inferredTitle;

	const content = `# ${title}

Write your chapter content here.
`;

	await mkdir(dirname(absoluteChapterPath), { recursive: true });
	await Bun.write(absoluteChapterPath, content);

	if (includeInSummary) {
		const summaryPath = resolve(loaded.config.srcDirAbsolute, "SUMMARY.md");
		await maybeAppendSummaryEntry(summaryPath, title, chapterPath);
	}

	const displayPath = relative(context.cwd, absoluteChapterPath);
	console.log(`Created chapter at ${displayPath}.`);

	if (includeInSummary) {
		console.log("Added chapter entry to SUMMARY.md.");
	} else {
		console.log("Remember to add this chapter to book/SUMMARY.md.");
	}

	return 0;
}

export { printNewHelp };
