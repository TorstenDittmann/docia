import { isAbsolute, parse, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { ConfigError } from "../errors";
import { DEFAULT_CONFIG, DEFAULT_CONFIG_FILES } from "./defaults";
import type {
	DociaConfig,
	DociaUserConfig,
	ImageOptimizationConfig,
	LoadedConfigResult,
	MarkdownAutolinksConfig,
	MarkdownHeadingsConfig,
	ResolvedConfig,
	SiteConfig,
	SiteSocialsConfig,
	ThemeColorMode,
	ThemeConfig,
} from "./types";

export interface LoadConfigOptions {
	cwd?: string;
	configFile?: string;
	required?: boolean;
	reload?: boolean;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	if (typeof value !== "object" || value === null) {
		return false;
	}

	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
}

function rejectUnknownKeys(
	value: Record<string, unknown>,
	allowedKeys: readonly string[],
	keyPath: string,
): void {
	const allowed = new Set(allowedKeys);
	const unknownKeys = Object.keys(value).filter((key) => !allowed.has(key));
	if (unknownKeys.length === 0) {
		return;
	}

	const location = keyPath.length > 0 ? ` at \`${keyPath}\`` : "";
	throw new ConfigError(
		`Unknown config ${unknownKeys.length === 1 ? "key" : "keys"}${location}: ${unknownKeys
			.map((key) => `\`${key}\``)
			.join(", ")}.`,
	);
}

function expectString(value: unknown, keyPath: string): string {
	if (typeof value !== "string") {
		throw new ConfigError(`Invalid config value at \`${keyPath}\`: expected a string.`);
	}

	const normalized = value.trim();
	if (normalized.length === 0) {
		throw new ConfigError(`Invalid config value at \`${keyPath}\`: string cannot be empty.`);
	}

	return normalized;
}

function expectStringAllowEmpty(value: unknown, keyPath: string): string {
	if (typeof value !== "string") {
		throw new ConfigError(`Invalid config value at \`${keyPath}\`: expected a string.`);
	}

	return value.trim();
}

function expectBoolean(value: unknown, keyPath: string): boolean {
	if (typeof value !== "boolean") {
		throw new ConfigError(`Invalid config value at \`${keyPath}\`: expected a boolean.`);
	}

	return value;
}

function expectIntegerInRange(
	value: unknown,
	keyPath: string,
	minimum: number,
	maximum: number,
): number {
	if (typeof value !== "number" || !Number.isInteger(value)) {
		throw new ConfigError(`Invalid config value at \`${keyPath}\`: expected an integer.`);
	}

	if (value < minimum || value > maximum) {
		throw new ConfigError(
			`Invalid config value at \`${keyPath}\`: expected a value from ${minimum} to ${maximum}.`,
		);
	}

	return value;
}

function expectStringArray(value: unknown, keyPath: string): string[] {
	if (!Array.isArray(value)) {
		throw new ConfigError(`Invalid config value at \`${keyPath}\`: expected an array.`);
	}

	return value.map((item, index) => expectString(item, `${keyPath}[${index}]`));
}

function normalizeBasePath(basePath: string): string {
	const trimmed = basePath.trim();
	if (trimmed.length === 0) {
		return "/";
	}

	let value = trimmed;
	if (!value.startsWith("/")) {
		value = `/${value}`;
	}

	if (value !== "/" && value.endsWith("/")) {
		value = value.slice(0, -1);
	}

	return value;
}

function normalizeSiteUrl(url: string): string {
	const trimmed = url.trim();
	if (trimmed.length === 0) {
		return "";
	}

	return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
}

function normalizeOptionalUrl(url: string): string {
	const trimmed = url.trim();
	if (trimmed.length === 0) {
		return "";
	}

	return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
}

function normalizePathPrefix(pathValue: string): string {
	return pathValue.trim().replace(/^\/+/, "").replace(/\/+$/, "");
}

function parseSocialsConfig(value: unknown): SiteSocialsConfig {
	if (!isPlainObject(value)) {
		throw new ConfigError("Invalid config value at `site.socials`: expected an object.");
	}
	rejectUnknownKeys(value, ["github", "x"], "site.socials");

	const socials: SiteSocialsConfig = {};
	if ("github" in value && value.github !== undefined) {
		const github = expectStringAllowEmpty(value.github, "site.socials.github");
		if (github.length > 0) {
			socials.github = github;
		}
	}

	if ("x" in value && value.x !== undefined) {
		const x = expectStringAllowEmpty(value.x, "site.socials.x");
		if (x.length > 0) {
			socials.x = x;
		}
	}

	return socials;
}

function parseAutolinksConfig(value: unknown): boolean | MarkdownAutolinksConfig {
	if (typeof value === "boolean") {
		return value;
	}
	if (!isPlainObject(value)) {
		throw new ConfigError(
			"Invalid config value at `markdown.autolinks`: expected boolean or object.",
		);
	}
	rejectUnknownKeys(value, ["url", "www", "email"], "markdown.autolinks");

	const nextValue: MarkdownAutolinksConfig = {};
	if ("url" in value && value.url !== undefined) {
		nextValue.url = expectBoolean(value.url, "markdown.autolinks.url");
	}
	if ("www" in value && value.www !== undefined) {
		nextValue.www = expectBoolean(value.www, "markdown.autolinks.www");
	}
	if ("email" in value && value.email !== undefined) {
		nextValue.email = expectBoolean(value.email, "markdown.autolinks.email");
	}

	return nextValue;
}

function parseHeadingsConfig(value: unknown): boolean | MarkdownHeadingsConfig {
	if (typeof value === "boolean") {
		return value;
	}
	if (!isPlainObject(value)) {
		throw new ConfigError(
			"Invalid config value at `markdown.headings`: expected boolean or object.",
		);
	}
	rejectUnknownKeys(value, ["ids"], "markdown.headings");

	const nextValue: MarkdownHeadingsConfig = {};
	if ("ids" in value && value.ids !== undefined) {
		nextValue.ids = expectBoolean(value.ids, "markdown.headings.ids");
	}

	return nextValue;
}

function parseSiteConfig(value: unknown): Partial<SiteConfig> {
	if (!isPlainObject(value)) {
		throw new ConfigError("Invalid config value at `site`: expected an object.");
	}
	rejectUnknownKeys(
		value,
		[
			"title",
			"description",
			"language",
			"url",
			"socials",
			"ogImage",
			"githubEditBaseUrl",
			"githubEditBranch",
			"githubEditPath",
		],
		"site",
	);

	const nextValue: Partial<SiteConfig> = {};
	if ("title" in value && value.title !== undefined) {
		nextValue.title = expectString(value.title, "site.title");
	}
	if ("description" in value && value.description !== undefined) {
		nextValue.description = expectStringAllowEmpty(value.description, "site.description");
	}
	if ("language" in value && value.language !== undefined) {
		nextValue.language = expectString(value.language, "site.language");
	}
	if ("url" in value && value.url !== undefined) {
		nextValue.url = expectStringAllowEmpty(value.url, "site.url");
	}
	if ("socials" in value && value.socials !== undefined) {
		nextValue.socials = parseSocialsConfig(value.socials);
	}
	if ("ogImage" in value && value.ogImage !== undefined) {
		nextValue.ogImage = expectStringAllowEmpty(value.ogImage, "site.ogImage");
	}
	if ("githubEditBaseUrl" in value && value.githubEditBaseUrl !== undefined) {
		nextValue.githubEditBaseUrl = expectStringAllowEmpty(
			value.githubEditBaseUrl,
			"site.githubEditBaseUrl",
		);
	}
	if ("githubEditBranch" in value && value.githubEditBranch !== undefined) {
		nextValue.githubEditBranch = expectStringAllowEmpty(
			value.githubEditBranch,
			"site.githubEditBranch",
		);
	}
	if ("githubEditPath" in value && value.githubEditPath !== undefined) {
		nextValue.githubEditPath = expectStringAllowEmpty(
			value.githubEditPath,
			"site.githubEditPath",
		);
	}

	return nextValue;
}

function parseThemeConfig(value: unknown): Partial<ThemeConfig> {
	if (!isPlainObject(value)) {
		throw new ConfigError("Invalid config value at `theme`: expected an object.");
	}
	rejectUnknownKeys(value, ["logo", "favicon", "accentColor", "customCss", "colorMode"], "theme");

	const nextValue: Partial<ThemeConfig> = {};
	if ("logo" in value && value.logo !== undefined) {
		nextValue.logo = expectStringAllowEmpty(value.logo, "theme.logo");
	}
	if ("favicon" in value && value.favicon !== undefined) {
		nextValue.favicon = expectStringAllowEmpty(value.favicon, "theme.favicon");
	}
	if ("accentColor" in value && value.accentColor !== undefined) {
		nextValue.accentColor = expectStringAllowEmpty(value.accentColor, "theme.accentColor");
	}
	if ("customCss" in value && value.customCss !== undefined) {
		nextValue.customCss = expectStringArray(value.customCss, "theme.customCss");
	}
	if ("colorMode" in value && value.colorMode !== undefined) {
		const colorMode = expectString(value.colorMode, "theme.colorMode");
		if (colorMode !== "system" && colorMode !== "light" && colorMode !== "dark") {
			throw new ConfigError(
				"Invalid config value at `theme.colorMode`: expected `system`, `light`, or `dark`.",
			);
		}
		nextValue.colorMode = colorMode as ThemeColorMode;
	}

	return nextValue;
}

function parseImageOptimizationConfig(value: unknown): Partial<ImageOptimizationConfig> {
	if (!isPlainObject(value)) {
		throw new ConfigError("Invalid config value at `images`: expected an object.");
	}
	rejectUnknownKeys(
		value,
		["optimize", "jpegQuality", "webpQuality", "pngCompressionLevel", "maxPixels"],
		"images",
	);

	const nextValue: Partial<ImageOptimizationConfig> = {};
	if ("optimize" in value && value.optimize !== undefined) {
		nextValue.optimize = expectBoolean(value.optimize, "images.optimize");
	}
	if ("jpegQuality" in value && value.jpegQuality !== undefined) {
		nextValue.jpegQuality = expectIntegerInRange(
			value.jpegQuality,
			"images.jpegQuality",
			1,
			100,
		);
	}
	if ("webpQuality" in value && value.webpQuality !== undefined) {
		nextValue.webpQuality = expectIntegerInRange(
			value.webpQuality,
			"images.webpQuality",
			1,
			100,
		);
	}
	if ("pngCompressionLevel" in value && value.pngCompressionLevel !== undefined) {
		nextValue.pngCompressionLevel = expectIntegerInRange(
			value.pngCompressionLevel,
			"images.pngCompressionLevel",
			0,
			9,
		);
	}
	if ("maxPixels" in value && value.maxPixels !== undefined) {
		nextValue.maxPixels = expectIntegerInRange(
			value.maxPixels,
			"images.maxPixels",
			1,
			1_000_000_000,
		);
	}

	return nextValue;
}

function parseUserConfig(value: unknown): DociaUserConfig {
	if (!isPlainObject(value)) {
		throw new ConfigError("Config file must export an object as its default export.");
	}
	rejectUnknownKeys(
		value,
		[
			"srcDir",
			"outDir",
			"publicDir",
			"basePath",
			"prettyUrls",
			"site",
			"theme",
			"images",
			"markdown",
		],
		"",
	);

	const config: DociaUserConfig = {};
	if ("srcDir" in value && value.srcDir !== undefined) {
		config.srcDir = expectString(value.srcDir, "srcDir");
	}
	if ("outDir" in value && value.outDir !== undefined) {
		config.outDir = expectString(value.outDir, "outDir");
	}
	if ("publicDir" in value && value.publicDir !== undefined) {
		config.publicDir = expectString(value.publicDir, "publicDir");
	}
	if ("basePath" in value && value.basePath !== undefined) {
		config.basePath = expectString(value.basePath, "basePath");
	}
	if ("prettyUrls" in value && value.prettyUrls !== undefined) {
		config.prettyUrls = expectBoolean(value.prettyUrls, "prettyUrls");
	}
	if ("site" in value && value.site !== undefined) {
		config.site = parseSiteConfig(value.site);
	}
	if ("theme" in value && value.theme !== undefined) {
		config.theme = parseThemeConfig(value.theme);
	}
	if ("images" in value && value.images !== undefined) {
		config.images = parseImageOptimizationConfig(value.images);
	}

	if ("markdown" in value && value.markdown !== undefined) {
		if (!isPlainObject(value.markdown)) {
			throw new ConfigError("Invalid config value at `markdown`: expected an object.");
		}
		rejectUnknownKeys(
			value.markdown,
			[
				"tables",
				"strikethrough",
				"tasklists",
				"autolinks",
				"headings",
				"hardSoftBreaks",
				"wikiLinks",
				"underline",
				"latexMath",
				"collapseWhitespace",
				"permissiveAtxHeaders",
				"noIndentedCodeBlocks",
				"noHtmlBlocks",
				"noHtmlSpans",
				"tagFilter",
			],
			"markdown",
		);

		const markdown = value.markdown;
		const nextValue: DociaUserConfig["markdown"] = {};

		if ("tables" in markdown && markdown.tables !== undefined) {
			nextValue.tables = expectBoolean(markdown.tables, "markdown.tables");
		}
		if ("strikethrough" in markdown && markdown.strikethrough !== undefined) {
			nextValue.strikethrough = expectBoolean(
				markdown.strikethrough,
				"markdown.strikethrough",
			);
		}
		if ("tasklists" in markdown && markdown.tasklists !== undefined) {
			nextValue.tasklists = expectBoolean(markdown.tasklists, "markdown.tasklists");
		}
		if ("autolinks" in markdown && markdown.autolinks !== undefined) {
			nextValue.autolinks = parseAutolinksConfig(markdown.autolinks);
		}
		if ("headings" in markdown && markdown.headings !== undefined) {
			nextValue.headings = parseHeadingsConfig(markdown.headings);
		}
		if ("hardSoftBreaks" in markdown && markdown.hardSoftBreaks !== undefined) {
			nextValue.hardSoftBreaks = expectBoolean(
				markdown.hardSoftBreaks,
				"markdown.hardSoftBreaks",
			);
		}
		if ("wikiLinks" in markdown && markdown.wikiLinks !== undefined) {
			nextValue.wikiLinks = expectBoolean(markdown.wikiLinks, "markdown.wikiLinks");
		}
		if ("underline" in markdown && markdown.underline !== undefined) {
			nextValue.underline = expectBoolean(markdown.underline, "markdown.underline");
		}
		if ("latexMath" in markdown && markdown.latexMath !== undefined) {
			nextValue.latexMath = expectBoolean(markdown.latexMath, "markdown.latexMath");
		}
		if ("collapseWhitespace" in markdown && markdown.collapseWhitespace !== undefined) {
			nextValue.collapseWhitespace = expectBoolean(
				markdown.collapseWhitespace,
				"markdown.collapseWhitespace",
			);
		}
		if ("permissiveAtxHeaders" in markdown && markdown.permissiveAtxHeaders !== undefined) {
			nextValue.permissiveAtxHeaders = expectBoolean(
				markdown.permissiveAtxHeaders,
				"markdown.permissiveAtxHeaders",
			);
		}
		if ("noIndentedCodeBlocks" in markdown && markdown.noIndentedCodeBlocks !== undefined) {
			nextValue.noIndentedCodeBlocks = expectBoolean(
				markdown.noIndentedCodeBlocks,
				"markdown.noIndentedCodeBlocks",
			);
		}
		if ("noHtmlBlocks" in markdown && markdown.noHtmlBlocks !== undefined) {
			nextValue.noHtmlBlocks = expectBoolean(markdown.noHtmlBlocks, "markdown.noHtmlBlocks");
		}
		if ("noHtmlSpans" in markdown && markdown.noHtmlSpans !== undefined) {
			nextValue.noHtmlSpans = expectBoolean(markdown.noHtmlSpans, "markdown.noHtmlSpans");
		}
		if ("tagFilter" in markdown && markdown.tagFilter !== undefined) {
			nextValue.tagFilter = expectBoolean(markdown.tagFilter, "markdown.tagFilter");
		}

		config.markdown = nextValue;
	}

	return config;
}

function mergeConfig(userConfig: DociaUserConfig): DociaConfig {
	const merged: DociaConfig = {
		...DEFAULT_CONFIG,
		site: { ...DEFAULT_CONFIG.site },
		theme: { ...DEFAULT_CONFIG.theme },
		images: { ...DEFAULT_CONFIG.images },
		markdown: { ...DEFAULT_CONFIG.markdown },
	};

	if (userConfig.srcDir !== undefined) {
		merged.srcDir = userConfig.srcDir;
	}
	if (userConfig.outDir !== undefined) {
		merged.outDir = userConfig.outDir;
	}
	if (userConfig.publicDir !== undefined) {
		merged.publicDir = userConfig.publicDir;
	}
	if (userConfig.basePath !== undefined) {
		merged.basePath = userConfig.basePath;
	}
	if (userConfig.prettyUrls !== undefined) {
		merged.prettyUrls = userConfig.prettyUrls;
	}
	if (userConfig.site !== undefined) {
		merged.site = {
			...merged.site,
			...userConfig.site,
		};
	}
	if (userConfig.theme !== undefined) {
		merged.theme = {
			...merged.theme,
			...userConfig.theme,
		};
	}
	if (userConfig.images !== undefined) {
		merged.images = {
			...merged.images,
			...userConfig.images,
		};
	}
	if (userConfig.markdown !== undefined) {
		merged.markdown = {
			...merged.markdown,
			...userConfig.markdown,
		};
	}

	merged.basePath = normalizeBasePath(merged.basePath);
	merged.site.url = normalizeSiteUrl(merged.site.url);
	merged.site.socials = {
		...DEFAULT_CONFIG.site.socials,
		...merged.site.socials,
	};

	if (merged.site.socials.github !== undefined) {
		const normalizedGithub = normalizeOptionalUrl(merged.site.socials.github);
		if (normalizedGithub.length > 0) {
			merged.site.socials.github = normalizedGithub;
		} else {
			delete merged.site.socials.github;
		}
	}

	if (merged.site.socials.x !== undefined) {
		const normalizedX = normalizeOptionalUrl(merged.site.socials.x);
		if (normalizedX.length > 0) {
			merged.site.socials.x = normalizedX;
		} else {
			delete merged.site.socials.x;
		}
	}

	merged.site.githubEditBaseUrl = normalizeOptionalUrl(merged.site.githubEditBaseUrl);
	merged.site.githubEditBranch = merged.site.githubEditBranch.trim() || "main";
	merged.site.githubEditPath = normalizePathPrefix(merged.site.githubEditPath);
	merged.theme.logo = merged.theme.logo.trim();
	merged.theme.favicon = merged.theme.favicon.trim();
	merged.theme.accentColor = merged.theme.accentColor.trim();
	merged.theme.customCss = merged.theme.customCss.map((href) => href.trim());

	return merged;
}

function isSameOrInside(parentPath: string, childPath: string): boolean {
	const relativePath = relative(parentPath, childPath);
	return (
		relativePath === "" ||
		(!relativePath.startsWith(`..${sep}`) && relativePath !== ".." && !isAbsolute(relativePath))
	);
}

function validateOutputPath(config: ResolvedConfig): void {
	const outputPath = config.outDirAbsolute;
	const filesystemRoot = parse(outputPath).root;

	if (outputPath === filesystemRoot) {
		throw new ConfigError(
			"Unsafe `outDir`: refusing to use a filesystem root as build output.",
		);
	}

	if (isSameOrInside(outputPath, config.cwd)) {
		throw new ConfigError(
			"Unsafe `outDir`: build output cannot be the project directory or one of its parents.",
		);
	}

	for (const [label, protectedPath] of [
		["srcDir", config.srcDirAbsolute],
		["publicDir", config.publicDirAbsolute],
	] as const) {
		if (
			isSameOrInside(outputPath, protectedPath) ||
			isSameOrInside(protectedPath, outputPath)
		) {
			throw new ConfigError(
				`Unsafe \`outDir\`: build output must not overlap \`${label}\` (${protectedPath}).`,
			);
		}
	}
}

async function findDefaultConfigFile(cwd: string): Promise<string | null> {
	for (const candidateFile of DEFAULT_CONFIG_FILES) {
		const absolutePath = resolve(cwd, candidateFile);
		const exists = await Bun.file(absolutePath).exists();
		if (exists) {
			return absolutePath;
		}
	}

	return null;
}

async function importConfigFile(filePath: string, reload = false): Promise<unknown> {
	const baseUrl = pathToFileURL(filePath).href;
	const specifier = reload ? `${baseUrl}?t=${Date.now()}` : baseUrl;

	try {
		const loadedModule = await import(specifier);
		if ("default" in loadedModule) {
			return loadedModule.default;
		}

		return loadedModule;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		throw new ConfigError(`Failed to load config file \`${filePath}\`: ${message}`);
	}
}

export async function loadConfig(options: LoadConfigOptions = {}): Promise<LoadedConfigResult> {
	const cwd = resolve(options.cwd ?? process.cwd());
	const required = options.required === true;
	const explicitConfigPath =
		options.configFile !== undefined ? resolve(cwd, options.configFile) : null;

	let configFilePath: string | null;
	if (explicitConfigPath !== null) {
		const exists = await Bun.file(explicitConfigPath).exists();
		if (!exists) {
			throw new ConfigError(
				`Config file \`${explicitConfigPath}\` does not exist or is not readable.`,
			);
		}
		configFilePath = explicitConfigPath;
	} else {
		configFilePath = await findDefaultConfigFile(cwd);
	}

	if (configFilePath === null && required) {
		throw new ConfigError(
			`No config file found. Create one of: ${DEFAULT_CONFIG_FILES.join(", ")}`,
		);
	}

	const source: LoadedConfigResult["source"] = configFilePath === null ? "defaults" : "file";

	const userConfig =
		configFilePath === null
			? {}
			: parseUserConfig(await importConfigFile(configFilePath, options.reload));

	const merged = mergeConfig(userConfig);

	const resolved: ResolvedConfig = {
		...merged,
		cwd,
		configFilePath,
		srcDirAbsolute: resolve(cwd, merged.srcDir),
		outDirAbsolute: resolve(cwd, merged.outDir),
		publicDirAbsolute: resolve(cwd, merged.publicDir),
	};
	validateOutputPath(resolved);

	return {
		config: resolved,
		source,
	};
}
