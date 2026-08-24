import { resolve } from "node:path";
import type { SearchIndexEntry } from "./types";

export interface SearchIndexArtifact {
	contents: string;
	fileName: string;
}

const SEARCH_INDEX_SOURCE_NAME = "search-index.json";

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

export async function createSearchIndexArtifact(
	entries: SearchIndexEntry[],
): Promise<SearchIndexArtifact> {
	const indexData = {
		version: 1,
		pages: entries,
	};
	const contents = JSON.stringify(indexData);
	const result = await Bun.build({
		entrypoints: [SEARCH_INDEX_SOURCE_NAME],
		naming: {
			asset: "[name]-[hash].[ext]",
		},
		loader: {
			".json": "file",
		},
		files: {
			[SEARCH_INDEX_SOURCE_NAME]: contents,
		},
	});
	const asset = result.outputs.find((output) => output.kind === "asset");

	if (!result.success || !asset?.hash) {
		throw new Error("Failed to fingerprint search index");
	}

	return {
		contents,
		fileName: `search-index-${asset.hash}.json`,
	};
}

export async function emitSearchIndex(
	outDirAbsolute: string,
	artifact: SearchIndexArtifact,
): Promise<void> {
	await Bun.write(resolve(outDirAbsolute, artifact.fileName), artifact.contents);
}

export type { SearchIndexEntry } from "./types";
