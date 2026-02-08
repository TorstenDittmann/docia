# Configuration

`docia` reads configuration from `docia.config.ts` by default.

Example:

```ts
export default {
	srcDir: "book",
	outDir: "dist",
	publicDir: "public",
	basePath: "/",
	prettyUrls: true,
	site: {
		title: "My Docs",
		description: "Product and API documentation",
		language: "en",
		url: "https://docs.example.com",
		socials: {
			github: "https://github.com/acme/docs",
			x: "https://x.com/acme",
		},
		githubEditBaseUrl: "https://github.com/acme/docs/edit/main/book",
		githubEditBranch: "main",
		githubEditPath: "book",
	},
	markdown: {
		headings: { ids: true },
		autolinks: true,
		tables: true,
		tasklists: true,
		strikethrough: true,
		tagFilter: true,
	},
};
```

## Core options

- `srcDir`: source markdown root
- `outDir`: generated static output
- `publicDir`: static asset input directory
- `basePath`: URL prefix for subpath hosting (for example `/docs`)
- `prettyUrls`: `/chapter/` style routes vs `.html` routes

## Site metadata

- `site.title`: global site title
- `site.description`: default page description
- `site.language`: HTML `lang`
- `site.url`: canonical base URL used by SEO artifacts
- `site.socials.github`: optional GitHub link shown in sidebar
- `site.socials.x`: optional X link shown in sidebar
- `site.githubEditBaseUrl`: optional full GitHub edit URL prefix for source files
- `site.githubEditBranch`: branch used when deriving edit links from `site.socials.github`
- `site.githubEditPath`: repo path to docs source (defaults to `srcDir`)

## Markdown options

`docia` uses Bun's markdown parser and supports Bun parser options via `markdown`.

Useful defaults are already enabled, including headings IDs and common GFM features.
