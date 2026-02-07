# Deployments

The docs site can be published to any static host.

## Release checklist

- [ ] Run `bun run src/cli.ts check --config examples/team-handbook/docia.config.ts`
- [ ] Run `bun run src/cli.ts build --config examples/team-handbook/docia.config.ts`
- [ ] Confirm output contains `sitemap.xml`, `robots.txt`, and chapter pages
- [ ] Upload `examples/team-handbook/dist` to your host

## Verification

After deployment:

1. Open the homepage and verify chapter navigation.
2. Run a crawl to confirm there are no broken links.
3. Verify `search-index.json` is publicly accessible.
