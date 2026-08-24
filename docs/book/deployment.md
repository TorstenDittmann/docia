# Deployment

`docia` outputs static files, so you can deploy to any static host.

## Standard release flow

```bash
docia check
docia build
```

Upload `dist/` to your hosting provider.

During the build, docia uses Bun.Image to optimize JPEG, PNG, and WebP files from `publicDir` while
preserving their paths. The build summary reports how many images changed and the total bytes saved.

## Files to verify after build

- chapter pages (`index.html` files)
- `robots.txt`
- `sitemap.xml`
- `llms.txt`
- `search-index-[hash].json`
- `404.html`

Redirects declared with page front matter are emitted as small static HTML files. They use a
canonical link, an HTML refresh fallback, and JavaScript navigation, so they work on generic static
hosts without provider-specific configuration.

## Base path deployments

If your site is hosted under a subpath (for example `/docs`), set:

```ts
basePath: "/docs";
```

Then rebuild so generated links and metadata use the correct prefix.

## Release integrity

Official release archives are published with `SHA256SUMS`. The one-line installer verifies the
download before installing it.
