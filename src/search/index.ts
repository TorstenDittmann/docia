import { resolve } from "node:path";
import type { SearchIndexEntry } from "./types";

export interface SearchIndexArtifact {
	cacheKey: string;
	contents: string;
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
		pages: entries,
	};
	const cacheKey = new Bun.CryptoHasher("sha256")
		.update(JSON.stringify(indexData))
		.digest("hex")
		.slice(0, 16);

	return {
		cacheKey,
		contents: JSON.stringify({
			...indexData,
			generatedAt: new Date().toISOString(),
		}),
	};
}

export async function emitSearchIndex(
	outDirAbsolute: string,
	artifact: SearchIndexArtifact,
): Promise<void> {
	await Bun.write(resolve(outDirAbsolute, "search-index.json"), artifact.contents);
}

export type { SearchIndexEntry } from "./types";
