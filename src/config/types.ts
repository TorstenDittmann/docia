export interface SiteSocialsConfig {
	github?: string;
	x?: string;
}

export interface SiteConfig {
	title: string;
	description: string;
	language: string;
	url: string;
	socials: SiteSocialsConfig;
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

export interface GoodDocsConfig {
	srcDir: string;
	outDir: string;
	publicDir: string;
	basePath: string;
	prettyUrls: boolean;
	site: SiteConfig;
	markdown: MarkdownConfig;
}

export interface GoodDocsUserConfig {
	srcDir?: string;
	outDir?: string;
	publicDir?: string;
	basePath?: string;
	prettyUrls?: boolean;
	site?: Partial<SiteConfig>;
	markdown?: Partial<MarkdownConfig>;
}

export interface ResolvedConfig extends GoodDocsConfig {
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
