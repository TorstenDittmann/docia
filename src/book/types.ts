export type SummaryEntryKind = "section" | "chapter" | "link";

export interface SummaryBaseEntry {
  id: string;
  kind: SummaryEntryKind;
  title: string;
  depth: number;
  line: number;
  parentId: string | null;
  children: SummaryEntry[];
}

export interface SummarySectionEntry extends SummaryBaseEntry {
  kind: "section";
}

export interface SummaryLinkEntry extends SummaryBaseEntry {
  kind: "link";
  href: string;
  external: boolean;
}

export interface SummaryChapterEntry extends SummaryBaseEntry {
  kind: "chapter";
  href: string;
  sourcePath: string;
  sourceAbsolutePath: string;
  routePath: string;
  outputPath: string;
  order: number;
  previousChapterId: string | null;
  nextChapterId: string | null;
}

export type SummaryEntry =
  | SummarySectionEntry
  | SummaryLinkEntry
  | SummaryChapterEntry;

export interface SummaryGraph {
  summaryPath: string;
  entries: SummaryEntry[];
  chapters: SummaryChapterEntry[];
  chapterBySourcePath: Map<string, SummaryChapterEntry>;
  entryById: Map<string, SummaryEntry>;
  firstChapterId: string | null;
  lastChapterId: string | null;
}
