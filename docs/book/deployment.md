# Deployment

`docia` outputs static files, so you can deploy to any static host.

## Standard release flow

```bash
docia check
docia build
```

Upload `dist/` to your hosting provider.

## Files to verify after build

- chapter pages (`index.html` files)
- `robots.txt`
- `sitemap.xml`
- `llms.txt`
- `search-index.json`

## Base path deployments

If your site is hosted under a subpath (for example `/docs`), set:

```ts
basePath: "/docs"
```

Then rebuild so generated links and metadata use the correct prefix.
