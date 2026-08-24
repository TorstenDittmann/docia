# Page Front Matter

Add optional YAML front matter at the beginning of a chapter to control its page metadata and URL.
The title in `SUMMARY.md` remains the sidebar label.

```yaml
---
title: Install the CLI
description: Install docia on macOS, Linux, or Windows.
slug: /installation
ogImage: /social/installation.png
noindex: false
redirectFrom:
    - /install
    - /getting-started/install
---
```

## Fields

- `title`: browser, search, Open Graph, and page metadata title
- `description`: page-specific search and social description
- `slug`: stable URL path independent of the Markdown filename
- `ogImage`: page-specific social preview image
- `draft`: omit the page and its nested navigation from production builds
- `noindex`: keep the page available but omit it from sitemaps and `llms.txt`
- `redirectFrom`: old paths that should redirect to the page

Draft pages are included by `docia dev` for previewing and marked `noindex`. A production
`docia build` omits them. `docia check` reports links from published pages to drafts.

Redirect paths and slugs must be URL paths without a protocol, query string, hash, or `.html`
extension. Output formatting still follows `prettyUrls`.
