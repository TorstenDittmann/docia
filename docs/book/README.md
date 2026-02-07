# docia

`docia` is a Bun-native static documentation generator inspired by `mdBook`.

It is designed for:

- SEO-friendly static output
- fast local development with rebuild-on-change
- simple chapter navigation using `SUMMARY.md`
- LLM-friendly docs output (`llms.txt` + per-page markdown)

## Build this guide

From the repository root:

```bash
bun run src/cli.ts dev --config docs/docia.config.ts
```

Or generate static output:

```bash
bun run src/cli.ts build --config docs/docia.config.ts
```
