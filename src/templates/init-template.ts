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

export function createInitTemplate(options: InitTemplateOptions): InitTemplateFile[] {
	const title = escapeForDoubleQuotes(options.title);
	const description = escapeForDoubleQuotes(options.description);
	const language = escapeForDoubleQuotes(options.language);

	return [
		{
			path: "docia.config.ts",
			contents: `import { defineConfig } from "docia";

export default defineConfig({
  srcDir: "book",
  outDir: "dist",
  site: {
    title: "${title}",
    description: "${description}",
    language: "${language}",
  },
});
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

Use \`docia build\` to generate static HTML output.
`,
		},
		{
			path: "book/getting-started.md",
			contents: `# Getting Started

This chapter is a starting point for your docs.

1. Edit this file.
2. Update \`book/SUMMARY.md\`.
3. Run \`docia dev\` while writing.
`,
		},
		{
			path: "public/.gitkeep",
			contents: "",
		},
	];
}
