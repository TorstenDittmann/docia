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
			path: "public/favicon.svg",
			contents: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#0d4f8f"/>
  <path d="M18 15h18c7.7 0 14 6.3 14 14v20H32c-7.7 0-14-6.3-14-14V15Zm8 9v11c0 3.3 2.7 6 6 6h10V29c0-2.8-2.2-5-5-5H26Z" fill="white"/>
</svg>
`,
		},
		{
			path: ".gitignore",
			contents: `dist/
.DS_Store
`,
		},
	];
}
