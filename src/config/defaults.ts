import type { DociaConfig } from "./types";

export const DEFAULT_CONFIG_FILES = [
	"docia.config.ts",
	"docia.config.js",
	"docia.config.mjs",
] as const;

export const DEFAULT_CONFIG: DociaConfig = {
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
		ogImage: "",
		githubEditBaseUrl: "",
		githubEditBranch: "main",
		githubEditPath: "",
	},
	theme: {
		logo: "",
		favicon: "/favicon.svg",
		accentColor: "",
		customCss: [],
		colorMode: "system",
	},
	images: {
		optimize: true,
		jpegQuality: 82,
		webpQuality: 82,
		pngCompressionLevel: 9,
		maxPixels: 64_000_000,
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
