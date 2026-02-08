# Introduction

Welcome to docia — a static documentation generator that prioritizes readability, search engines, and AI assistants.

## What is docia?

docia turns your Markdown files into a fast, navigable documentation site. It uses a simple `SUMMARY.md` file to define your document structure, then generates static HTML with:

- Clean navigation sidebar
- Table of contents for each page
- Previous/next page links
- Full-text search index
- SEO metadata (sitemap, robots.txt, JSON-LD)
- LLM-friendly exports (`llms.txt` + per-page markdown)

## Who is it for?

- **Product teams** — User guides, API documentation, changelogs
- **Engineering teams** — Internal handbooks, runbooks, architecture docs
- **Open source projects** — README replacements, contribution guides

## Getting Started

New to docia? Start here:

1. [Installation](installation.md) — Get docia running
2. [Quick Start](quick-start.md) — Build your first docs site
3. [Project Structure](project-structure.md) — Understand the file layout

## Build this guide

From the repository root:

```bash
bun run src/cli.ts dev --config docs/docia.config.ts
```

Or generate static output:

```bash
bun run src/cli.ts build --config docs/docia.config.ts
```
