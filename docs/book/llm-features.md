# LLM Features

`docia` includes first-class LLM support in static output.

## `/llms.txt`

On build, `docia` emits `llms.txt` at site root.

It follows the [llmstxt.org](https://llmstxt.org/) structure:

- H1 site title
- optional blockquote summary
- `## Docs` section linking important markdown pages
- `## Optional` section for extra context links

## Per-page markdown output

For each page, `docia` emits a markdown mirror next to generated HTML:

- `/index.html` + `/index.html.md`
- `/guides/setup/index.html` + `/guides/setup/index.html.md`

This makes it easy for assistants and IDE tools to fetch clean markdown context.

## Page actions menu

Every page includes a markdown action control:

- `Copy markdown`
- `View markdown`
- `Open in ChatGPT`
- `Open in Claude`

These are client-side helpers; static output remains usable without JavaScript.

## Discovery links

Every generated HTML page includes the standard discovery relations recommended by llms.txt v2:

- `rel="alternate" type="text/markdown"` points to the page's Markdown mirror
- `rel="describedby"` points to the site's `llms.txt`

The existing `docia-markdown-url` and `docia-llms-url` metadata remains available for docia's
client-side actions.
