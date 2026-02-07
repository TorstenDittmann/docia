import { resolve } from "node:path";
import type { SearchIndexEntry } from "./types";

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

export async function emitSearchIndex(
  outDirAbsolute: string,
  entries: SearchIndexEntry[],
): Promise<void> {
  const payload = {
    version: 1,
    generatedAt: new Date().toISOString(),
    pages: entries,
  };

  await Bun.write(resolve(outDirAbsolute, "search-index.json"), JSON.stringify(payload));
}

export type { SearchIndexEntry } from "./types";
