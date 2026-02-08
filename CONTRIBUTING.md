# Contributing

Thank you for your interest in contributing to docia!

## Development Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/docia
cd docia

# Install dependencies
bun install
```

## Running the CLI

During development, run commands directly from source:

```bash
bun run src/cli.ts --help
bun run src/cli.ts init my-test-project
bun run src/cli.ts dev --config docs/docia.config.ts
```

## Testing

```bash
bun test
```

## Linting and Formatting

```bash
# Check code
bun run lint

# Fix issues
bun run lint:fix

# Format code
bun run fmt
```

## Project Status

Foundation features implemented:

- CLI command skeleton
- Config loading and validation (`docia.config.ts`)
- Project scaffolding via `init`
- `SUMMARY.md` parser + chapter graph (nesting, prev/next)
- Bun-native Markdown rendering (`Bun.markdown.html/render`)
- Client assets bundled with `Bun.build` (JS + CSS loaders)
- Static HTML build output with sidebar, TOC, and pagination
- SPA-style client routing after first page load
- Shiki build-time syntax highlighting for code blocks
- Build-time JSX page rendering (Preact SSR, no hydration required)
- Basic SEO output (`canonical`, meta description, JSON-LD, `robots.txt`, `llms.txt`)
- LLM-friendly page actions (copy markdown, view markdown, open in ChatGPT/Claude)
- Sidebar socials and optional GitHub edit links
- `dev` and `serve` on `Bun.serve()`
- `check` validations for missing files, duplicate routes/output paths, broken markdown links, and orphan markdown files

## Submitting Changes

1. Create a new branch for your feature or fix
2. Make your changes with clear commit messages
3. Ensure tests pass: `bun test`
4. Run linting: `bun run lint`
5. Submit a pull request with a description of your changes

## Reporting Issues

Please include:

- Bun version (`bun --version`)
- Operating system
- Steps to reproduce
- Expected vs actual behavior
