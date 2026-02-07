import { escapeForDoubleQuotes } from "../utils/strings";

export interface InitTemplateOptions {
  title: string;
  description: string;
  language: string;
}

export interface InitTemplateFile {
  path: string;
  contents: string;
}

export function createInitTemplate(
  options: InitTemplateOptions,
): InitTemplateFile[] {
  const title = escapeForDoubleQuotes(options.title);
  const description = escapeForDoubleQuotes(options.description);
  const language = escapeForDoubleQuotes(options.language);

  return [
    {
      path: "good-docs.config.ts",
      contents: `export default {
  srcDir: "book",
  outDir: "dist",
  publicDir: "public",
  basePath: "/",
  prettyUrls: true,
  site: {
    title: "${title}",
    description: "${description}",
    language: "${language}",
    url: "",
  },
  markdown: {
    tables: true,
    strikethrough: true,
    tasklists: true,
    autolinks: true,
    headings: { ids: true },
    tagFilter: true,
  },
};
`,
    },
    {
      path: "book/SUMMARY.md",
      contents: `# Summary

- [Introduction](README.md)
- [Getting Started](getting-started.md)
`,
    },
    {
      path: "book/README.md",
      contents: `# ${options.title}

Welcome to your documentation site.

Use \`good-docs build\` to generate static HTML output.
`,
    },
    {
      path: "book/getting-started.md",
      contents: `# Getting Started

This chapter is a starting point for your docs.

1. Edit this file.
2. Update \`book/SUMMARY.md\`.
3. Run \`good-docs dev\` while writing.
`,
    },
    {
      path: "public/.gitkeep",
      contents: "",
    },
  ];
}
