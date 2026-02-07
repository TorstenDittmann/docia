import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { ConfigError } from "../errors";
import { DEFAULT_CONFIG, DEFAULT_CONFIG_FILES } from "./defaults";
import type {
  GoodDocsConfig,
  GoodDocsUserConfig,
  LoadedConfigResult,
  MarkdownAutolinksConfig,
  MarkdownHeadingsConfig,
  ResolvedConfig,
  SiteConfig,
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

function expectString(value: unknown, keyPath: string): string {
  if (typeof value !== "string") {
    throw new ConfigError(`Invalid config value at \`${keyPath}\`: expected a string.`);
  }

  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new ConfigError(
      `Invalid config value at \`${keyPath}\`: string cannot be empty.`,
    );
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

function parseAutolinksConfig(value: unknown): boolean | MarkdownAutolinksConfig {
  if (typeof value === "boolean") {
    return value;
  }

  if (!isPlainObject(value)) {
    throw new ConfigError(
      "Invalid config value at `markdown.autolinks`: expected boolean or object.",
    );
  }

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

  return nextValue;
}

function parseUserConfig(value: unknown): GoodDocsUserConfig {
  if (!isPlainObject(value)) {
    throw new ConfigError(
      "Config file must export an object as its default export.",
    );
  }

  const config: GoodDocsUserConfig = {};
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

  if ("markdown" in value && value.markdown !== undefined) {
    if (!isPlainObject(value.markdown)) {
      throw new ConfigError("Invalid config value at `markdown`: expected an object.");
    }

    const markdown = value.markdown;
    const nextValue: GoodDocsUserConfig["markdown"] = {};

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
    if (
      "collapseWhitespace" in markdown &&
      markdown.collapseWhitespace !== undefined
    ) {
      nextValue.collapseWhitespace = expectBoolean(
        markdown.collapseWhitespace,
        "markdown.collapseWhitespace",
      );
    }
    if (
      "permissiveAtxHeaders" in markdown &&
      markdown.permissiveAtxHeaders !== undefined
    ) {
      nextValue.permissiveAtxHeaders = expectBoolean(
        markdown.permissiveAtxHeaders,
        "markdown.permissiveAtxHeaders",
      );
    }
    if (
      "noIndentedCodeBlocks" in markdown &&
      markdown.noIndentedCodeBlocks !== undefined
    ) {
      nextValue.noIndentedCodeBlocks = expectBoolean(
        markdown.noIndentedCodeBlocks,
        "markdown.noIndentedCodeBlocks",
      );
    }
    if ("noHtmlBlocks" in markdown && markdown.noHtmlBlocks !== undefined) {
      nextValue.noHtmlBlocks = expectBoolean(
        markdown.noHtmlBlocks,
        "markdown.noHtmlBlocks",
      );
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

function mergeConfig(userConfig: GoodDocsUserConfig): GoodDocsConfig {
  const merged: GoodDocsConfig = {
    ...DEFAULT_CONFIG,
    site: { ...DEFAULT_CONFIG.site },
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
  if (userConfig.markdown !== undefined) {
    merged.markdown = {
      ...merged.markdown,
      ...userConfig.markdown,
    };
  }

  merged.basePath = normalizeBasePath(merged.basePath);
  merged.site.url = normalizeSiteUrl(merged.site.url);

  return merged;
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

export async function loadConfig(
  options: LoadConfigOptions = {},
): Promise<LoadedConfigResult> {
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

  const source: LoadedConfigResult["source"] =
    configFilePath === null ? "defaults" : "file";

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

  return {
    config: resolved,
    source,
  };
}
