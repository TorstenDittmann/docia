export interface SiteSocialsConfig {
	github?: string;
	x?: string;
}

export type ThemeColorMode = "system" | "light" | "dark";

export interface ThemeConfig {
	logo: string;
	favicon: string;
	accentColor: string;
	customCss: string[];
	colorMode: ThemeColorMode;
}

export interface SiteConfig {
	title: string;
	description: string;
	language: string;
	url: string;
	socials: SiteSocialsConfig;
	ogImage: string;
	githubEditBaseUrl: string;
	githubEditBranch: string;
	githubEditPath: string;
}

export interface MarkdownAutolinksConfig {
	url?: boolean;
	www?: boolean;
	email?: boolean;
}

export interface MarkdownHeadingsConfig {
	ids?: boolean;
}

export interface MarkdownConfig {
	tables: boolean;
	strikethrough: boolean;
	tasklists: boolean;
	autolinks: boolean | MarkdownAutolinksConfig;
	headings: boolean | MarkdownHeadingsConfig;
	hardSoftBreaks: boolean;
	wikiLinks: boolean;
	underline: boolean;
	latexMath: boolean;
	collapseWhitespace: boolean;
	permissiveAtxHeaders: boolean;
	noIndentedCodeBlocks: boolean;
	noHtmlBlocks: boolean;
	noHtmlSpans: boolean;
	tagFilter: boolean;
}

export interface ImageOptimizationConfig {
	optimize: boolean;
	jpegQuality: number;
	webpQuality: number;
	pngCompressionLevel: number;
	maxPixels: number;
}

export interface DociaConfig {
	srcDir: string;
	outDir: string;
	publicDir: string;
	basePath: string;
	prettyUrls: boolean;
	site: SiteConfig;
	theme: ThemeConfig;
	images: ImageOptimizationConfig;
	markdown: MarkdownConfig;
}

export interface DociaUserConfig {
	srcDir?: string;
	outDir?: string;
	publicDir?: string;
	basePath?: string;
	prettyUrls?: boolean;
	site?: Partial<SiteConfig>;
	theme?: Partial<ThemeConfig>;
	images?: Partial<ImageOptimizationConfig>;
	markdown?: Partial<MarkdownConfig>;
}

/** @deprecated Use `DociaConfig`. */
export type GoodDocsConfig = DociaConfig;

/** @deprecated Use `DociaUserConfig`. */
export type GoodDocsUserConfig = DociaUserConfig;

export interface ResolvedConfig extends DociaConfig {
	cwd: string;
	configFilePath: string | null;
	srcDirAbsolute: string;
	outDirAbsolute: string;
	publicDirAbsolute: string;
}

export interface LoadedConfigResult {
	config: ResolvedConfig;
	source: "defaults" | "file";
}
