# good-docs

SEO-first static docs generator in Bun, inspired by mdBook.

## Install

```bash
bun install
```

## CLI

```bash
bun run src/cli.ts --help
```

### Commands

- `bun run src/cli.ts init`
- `bun run src/cli.ts build`
- `bun run src/cli.ts dev`
- `bun run src/cli.ts serve`
- `bun run src/cli.ts check`
- `bun run src/cli.ts new <chapter-name>`

`dev` runs an initial build, serves `dist/`, and rebuilds on file changes.

## Example Project

See `examples/team-handbook` for a complete docs sample.

```bash
bun run src/cli.ts build --config examples/team-handbook/good-docs.config.ts
bun run src/cli.ts serve --config examples/team-handbook/good-docs.config.ts --build
```

## Status

Foundation is in progress:

- CLI command skeleton
- Config loading and validation (`good-docs.config.ts`)
- Project scaffolding via `init`
- `SUMMARY.md` parser + chapter graph (nesting, prev/next)
- Bun-native Markdown rendering (`Bun.markdown.html/render`)
- Client assets bundled with `Bun.build` (JS + CSS loaders)
- Static HTML build output with sidebar, TOC, and pagination
- Basic SEO output (`canonical`, meta description, JSON-LD, `robots.txt`, `llms.txt`)
- LLM-friendly page actions (copy markdown, view markdown, open in ChatGPT/Claude)
- `dev` and `serve` on `Bun.serve()`
- `check` validations for missing files, duplicate routes/output paths, broken markdown links, and orphan markdown files
