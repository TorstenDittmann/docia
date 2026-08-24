# Changelog

All notable changes to docia are documented here. The project follows Semantic Versioning from
version 1.0.0 onward.

## Unreleased

### Added

- YAML page front matter for titles, descriptions, slugs, social images, drafts, indexing, and redirects
- Generated redirect pages and a branded static `404.html`
- llms.txt v2 discovery links for Markdown mirrors and `llms.txt`
- Configurable logo, favicon, accent color, custom stylesheets, and persistent color modes
- Browser live reload, including changes from the public asset directory
- Code-block copy controls and heading permalinks
- Strict configuration validation and safe build-output path checks
- Native build-time JPEG, PNG, and WebP optimization powered by Bun.Image
- MIT license and package metadata for the 1.0 release

### Changed

- Public configuration types are now named `DociaConfig` and `DociaUserConfig`
- Search shows an alphabetical page list before a query is entered
- The package root now exports only the configuration API; the executable remains available as `docia`

### Fixed

- Public-asset reads during development no longer trigger recursive rebuild loops on macOS
- Fresh projects no longer emit metadata for a nonexistent default `/og.png`
- `site.ogImage` is now loaded from user configuration
- Generated branding now says “Powered by docia”
- Installation and repository links point to the canonical GitHub repository

## 0.0.15 - 2026-02-16

- Display the configured X username in the sidebar
- Reorganize the documentation navigation
