import { resolve } from "node:path";
import type { SearchIndexEntry } from "./types";

export interface SearchIndexArtifact {
	contents: string;
	fileName: string;
}

function normalizeText(input: string): string {
	return input.replace(/\s+/g, " ").trim();
}

function compactText(input: string, maxLength = 4000): string {
	const normalized = normalizeText(input);
	if (normalized.length <= maxLength) {
		return normalized;
	}

	return `${normalized.slice(0, maxLength - 3)}...`;
}

export function createSearchEntry(input: SearchIndexEntry): SearchIndexEntry {
	return {
		...input,
		title: input.title.trim(),
		text: compactText(input.text),
		routePath: input.routePath.trim(),
		sourcePath: input.sourcePath.trim(),
	};
}

export function createSearchIndexArtifact(entries: SearchIndexEntry[]): SearchIndexArtifact {
	const indexData = {
		version: 1,
		generatedAt: new Date().toISOString(),
		pages: entries,
	};
	const contents = JSON.stringify(indexData);
	const fingerprint = new Bun.CryptoHasher("sha256").update(contents).digest("hex").slice(0, 16);

	return {
		contents,
		fileName: `search-index-${fingerprint}.json`,
	};
}

export async function emitSearchIndex(
	outDirAbsolute: string,
	artifact: SearchIndexArtifact,
): Promise<void> {
	await Bun.write(resolve(outDirAbsolute, artifact.fileName), artifact.contents);
}

export type { SearchIndexEntry } from "./types";
