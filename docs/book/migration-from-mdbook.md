# Migrate from mdBook

`docia` intentionally keeps a familiar authoring model.

## Concept mapping

- `mdBook` `src/` -> `docia` `book/` (configurable with `srcDir`)
- `SUMMARY.md` -> `SUMMARY.md` (same concept)
- `book.toml` -> `docia.config.ts`
- `mdbook build` -> `docia build`
- `mdbook serve` -> `docia dev`

## Minimal migration checklist

1. Move content into your configured `srcDir` (default `book/`).
2. Keep or adapt your `SUMMARY.md` structure.
3. Create `docia.config.ts` with `site` metadata.
4. Run `docia check` and fix any missing links/files.
5. Run `docia build` and validate output.

## Notes

- `docia` emits additional artifacts (`llms.txt`, markdown mirrors, search index).
- Use route-style links (`/chapter/`) in markdown for best long-term stability.
