# Quick Start

This section walks through the default workflow.

## Minimal project example

`docia` automatically applies syntax highlighting to fenced code blocks.

`docia.config.ts`:

```ts
import { defineConfig } from "docia";

export default defineConfig({
	srcDir: "book",
	outDir: "dist",
	basePath: "/",
	prettyUrls: true,
	site: {
		title: "Acme Docs",
		description: "Internal engineering handbook",
		language: "en",
		url: "https://docs.acme.dev",
	},
});
```

`book/SUMMARY.md`:

```markdown
# Summary

- [Introduction](README.md)
- [Getting Started](getting-started.md)
- [Architecture](architecture.md)
```

## 1) Initialize

```bash
docia init handbook
cd handbook
```

This creates:

- `docia.config.ts`
- `book/SUMMARY.md`
- starter chapters

## 2) Run local dev

```bash
docia dev
```

`dev` performs an initial build, serves static output, and rebuilds when source files change.

## 3) Build production output

```bash
docia build
```

By default output goes to `dist/`.

## 4) Validate before deploy

```bash
docia check
```

This checks missing files, broken markdown links, duplicate output routes, and orphaned markdown files.
