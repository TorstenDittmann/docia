import type { GoodDocsConfig } from "./types";

export const DEFAULT_CONFIG_FILES = [
	"docia.config.ts",
	"docia.config.js",
	"docia.config.mjs",
] as const;

export const DEFAULT_CONFIG: GoodDocsConfig = {
	srcDir: "book",
	outDir: "dist",
	publicDir: "public",
	basePath: "/",
	prettyUrls: true,
	site: {
		title: "Documentation",
		description: "",
		language: "en",
		url: "",
		socials: {},
		githubEditBaseUrl: "",
		githubEditBranch: "main",
		githubEditPath: "",
	},
	markdown: {
		tables: true,
		strikethrough: true,
		tasklists: true,
		autolinks: true,
		headings: { ids: true },
		hardSoftBreaks: false,
		wikiLinks: false,
		underline: false,
		latexMath: false,
		collapseWhitespace: false,
		permissiveAtxHeaders: false,
		noIndentedCodeBlocks: false,
		noHtmlBlocks: false,
		noHtmlSpans: false,
		tagFilter: true,
	},
};
