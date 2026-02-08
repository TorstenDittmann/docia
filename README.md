# docia

> Documentation that works. For humans. And machines.

Generate beautiful, fast, SEO-ready documentation sites from Markdown.

## Features

- **Fast development** — Live reload on every save
- **SEO-first** — Sitemap, structured data, canonical URLs, robots.txt out of the box
- **Clean navigation** — Simple chapter structure via `SUMMARY.md`
- **LLM-ready** — `llms.txt` + per-page markdown for AI assistants
- **Static export** — Host anywhere (Vercel, Netlify, GitHub Pages, S3)

## Quick Start

```bash
# Create a new docs project
bunx docia init my-docs
cd my-docs

# Start development server
bunx docia dev
```

Your docs will be available at `http://localhost:3000`.

## Installation

**Requirements:** Bun 1.3+

```bash
# Install globally
bun install -g docia

# Or use directly with bunx
bunx docia --help
```

## Usage

```bash
# Initialize a new project
docia init my-docs

# Development with live reload
docia dev

# Build for production
docia build

# Validate before deploy
docia check
```

## Documentation

Full documentation: [docia.dev](https://docia.dev) (built with docia)

Or run the docs locally:

```bash
git clone https://github.com/yourusername/docia
cd docia
bun install
bun run src/cli.ts dev --config docs/docia.config.ts
```

## Example

See `examples/team-handbook/` for a complete documentation site example.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup and contribution guidelines.
