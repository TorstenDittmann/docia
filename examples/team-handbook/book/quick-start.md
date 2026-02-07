# Quick Start

This page gets a new engineer from zero to first docs contribution.

## Local workflow

```bash
# from repo root
bun install
bun run src/cli.ts dev --config examples/team-handbook/docia.config.ts
```

## First contribution checklist

1. Add or update a chapter under `book/`.
2. Register the chapter in `book/SUMMARY.md`.
3. Run `docia check` before opening a PR.

## Where to go next

- Review [Architecture Overview](architecture/overview.md)
- Understand rendering details in [Content Pipeline](architecture/content-pipeline.md)
- Follow release steps in [Deployments](operations/deployments.md)
