import { createHighlighter, type Highlighter } from "shiki";
import type { ResolvedConfig } from "../config/types";
import { stripHtml } from "../utils/html";

type ParserOptions = NonNullable<Parameters<typeof Bun.markdown.html>[1]>;

const HEADING_PATTERN = /<h([1-6])([^>]*)>([\s\S]*?)<\/h\1>/gi;
const CODE_BLOCK_PATTERN = /<pre><code([^>]*)>([\s\S]*?)<\/code><\/pre>/gi;

const SHIKI_THEMES = {
  light: "github-light",
  dark: "github-dark",
} as const;

const SHIKI_LANGUAGES = [
  "bash",
  "css",
  "diff",
  "dockerfile",
  "html",
  "ini",
  "javascript",
  "json",
  "markdown",
  "rust",
  "sql",
  "toml",
  "typescript",
  "xml",
  "yaml",
] as const;

const LANGUAGE_ALIASES: Record<string, string> = {
  cjs: "javascript",
  docker: "dockerfile",
  htm: "html",
  js: "javascript",
  jsx: "javascript",
  md: "markdown",
  mjs: "javascript",
  mts: "typescript",
  sh: "bash",
  shell: "bash",
  ts: "typescript",
  tsx: "typescript",
  yml: "yaml",
  zsh: "bash",
};

export interface MarkdownHeading {
  level: number;
  id: string | null;
  text: string;
}

export interface MarkdownRenderResult {
  html: string;
  plainText: string;
  searchText: string;
  headings: MarkdownHeading[];
}

export interface MarkdownEngine {
  renderHtml: (markdown: string) => string;
  toPlainText: (markdown: string) => string;
  toSearchText: (markdown: string) => string;
  extractHeadings: (html: string) => MarkdownHeading[];
  renderPage: (markdown: string) => MarkdownRenderResult;
}

function normalizeWhitespace(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

function stripHeadingAnchor(html: string): string {
  return html
    .replace(/<a[^>]*>([\s\S]*?)<\/a>/gi, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extractLanguageFromAttributes(attributes: string): string | null {
  const classMatch = /\bclass=(?:"([^"]+)"|'([^']+)')/i.exec(attributes);
  const classNameValue = classMatch?.[1] ?? classMatch?.[2] ?? "";

  if (classNameValue.length === 0) {
    return null;
  }

  const classes = classNameValue.split(/\s+/);
  for (const cssClass of classes) {
    if (cssClass.startsWith("language-")) {
      return cssClass.slice("language-".length);
    }
  }

  return null;
}

function normalizeLanguageName(language: string | null, highlighter: Highlighter): string {
  if (language === null) {
    return "text";
  }

  const normalized = language.trim().toLowerCase();
  if (normalized.length === 0) {
    return "text";
  }

  const mapped = LANGUAGE_ALIASES[normalized] ?? normalized;
  if (mapped === "text") {
    return mapped;
  }

  const loadedLanguages = new Set(highlighter.getLoadedLanguages().map(String));
  return loadedLanguages.has(mapped) ? mapped : "text";
}

function highlightCodeBlocks(html: string, highlighter: Highlighter): string {
  return html.replace(CODE_BLOCK_PATTERN, (fullMatch, attributes, encodedCode) => {
    const rawLanguage = extractLanguageFromAttributes(String(attributes));
    const language = normalizeLanguageName(rawLanguage, highlighter);
    const code = decodeHtmlEntities(String(encodedCode));

    try {
      return highlighter.codeToHtml(code, {
        lang: language,
        themes: SHIKI_THEMES,
      });
    } catch {
      return fullMatch;
    }
  });
}

export async function createMarkdownEngine(
  config: ResolvedConfig,
): Promise<MarkdownEngine> {
  const parserOptions: ParserOptions = {
    ...config.markdown,
  };

  const highlighter = await createHighlighter({
    themes: [SHIKI_THEMES.light, SHIKI_THEMES.dark],
    langs: [...SHIKI_LANGUAGES],
  });

  const renderHtml = (markdown: string): string => {
    const rawHtml = Bun.markdown.html(markdown, parserOptions);
    return highlightCodeBlocks(rawHtml, highlighter);
  };

  const toPlainText = (markdown: string): string => {
    const rendered = Bun.markdown.render(
      markdown,
      {
        heading: (children) => `${children}\n`,
        paragraph: (children) => `${children}\n`,
        blockquote: (children) => `${children}\n`,
        code: (children) => `${children}\n`,
        listItem: (children) => `${children}\n`,
        hr: () => "\n",
        link: (children) => children,
        image: () => "",
      },
      parserOptions,
    );

    return normalizeWhitespace(rendered);
  };

  const toSearchText = (markdown: string): string => {
    const rendered = Bun.markdown.render(
      markdown,
      {
        heading: (children) => `${children}\n`,
        paragraph: (children) => `${children}\n`,
        blockquote: (children) => `${children}\n`,
        listItem: (children) => `${children}\n`,
        link: (children) => children,
        table: (children) => `${children}\n`,
        tr: (children) => `${children}\n`,
        th: (children) => `${children} `,
        td: (children) => `${children} `,
        code: () => "",
        codespan: (children) => children,
        html: () => "",
        image: () => "",
        hr: () => "\n",
      },
      parserOptions,
    );

    return normalizeWhitespace(rendered);
  };

  const extractHeadings = (html: string): MarkdownHeading[] => {
    const headings: MarkdownHeading[] = [];
    let match: RegExpExecArray | null;

    while ((match = HEADING_PATTERN.exec(html)) !== null) {
      const levelRaw = match[1] ?? "1";
      const attrs = match[2] ?? "";
      const body = match[3] ?? "";

      const level = Number(levelRaw);
      if (!Number.isFinite(level) || level < 1 || level > 6) {
        continue;
      }

      const idMatch = /\sid=(?:"([^"]+)"|'([^']+)')/.exec(attrs);
      const id = idMatch?.[1] ?? idMatch?.[2] ?? null;
      const text = stripHeadingAnchor(body);
      if (text.length === 0) {
        continue;
      }

      headings.push({
        level,
        id,
        text,
      });
    }

    return headings;
  };

  const renderPage = (markdown: string): MarkdownRenderResult => {
    const html = renderHtml(markdown);
    const headings = extractHeadings(html);
    const plainText = normalizeWhitespace(stripHtml(html) || toPlainText(markdown));
    const searchText = toSearchText(markdown);

    return {
      html,
      plainText,
      searchText,
      headings,
    };
  };

  return {
    renderHtml,
    toPlainText,
    toSearchText,
    extractHeadings,
    renderPage,
  };
}
