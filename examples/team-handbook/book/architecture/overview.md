# Architecture Overview

Our docs stack follows a static-first pipeline:

1. Parse `SUMMARY.md` into a chapter graph.
2. Render Markdown chapters into HTML pages.
3. Emit search + SEO artifacts for static hosting.

![Architecture map](/architecture-map.svg)

## Principles

- Static output should work without JavaScript.
- Client scripts are progressive enhancement only.
- Navigation is deterministic from `SUMMARY.md`.

Implementation details live in [Content Pipeline](content-pipeline.md).
