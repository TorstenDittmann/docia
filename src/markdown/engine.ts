import type { ResolvedConfig } from "../config/types";
import { stripHtml } from "../utils/html";

type ParserOptions = NonNullable<Parameters<typeof Bun.markdown.html>[1]>;

export interface MarkdownHeading {
  level: number;
  id: string | null;
  text: string;
}

export interface MarkdownRenderResult {
  html: string;
  plainText: string;
  headings: MarkdownHeading[];
}

export interface MarkdownEngine {
  renderHtml: (markdown: string) => string;
  toPlainText: (markdown: string) => string;
  extractHeadings: (html: string) => MarkdownHeading[];
  renderPage: (markdown: string) => MarkdownRenderResult;
}

const HEADING_PATTERN = /<h([1-6])([^>]*)>([\s\S]*?)<\/h\1>/gi;

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

export function createMarkdownEngine(config: ResolvedConfig): MarkdownEngine {
  const parserOptions: ParserOptions = {
    ...config.markdown,
  };

  const renderHtml = (markdown: string): string =>
    Bun.markdown.html(markdown, parserOptions);

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

    return {
      html,
      plainText,
      headings,
    };
  };

  return {
    renderHtml,
    toPlainText,
    extractHeadings,
    renderPage,
  };
}
