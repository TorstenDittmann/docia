# Configuration

`docia` reads configuration from `docia.config.ts` by default.

Example:

```ts
import { defineConfig } from "docia";

export default defineConfig({
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
		ogImage: "/og.png",
		socials: {
			github: "https://github.com/acme/docs",
			x: "https://x.com/acme",
		},
		githubEditBaseUrl: "https://github.com/acme/docs/edit/main/book",
		githubEditBranch: "main",
		githubEditPath: "book",
	},
	theme: {
		logo: "/logo.svg",
		favicon: "/favicon.svg",
		accentColor: "#0d9488",
		customCss: ["/custom.css"],
		colorMode: "system",
	},
	images: {
		optimize: true,
		jpegQuality: 82,
		webpQuality: 82,
		pngCompressionLevel: 9,
		maxPixels: 64_000_000,
	},
	markdown: {
		headings: { ids: true },
		autolinks: true,
		tables: true,
		tasklists: true,
		strikethrough: true,
		tagFilter: true,
	},
});
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
- `site.ogImage`: default social preview image

## Theme options

- `theme.logo`: optional logo shown beside the site title
- `theme.favicon`: favicon path, or an empty string to omit it
- `theme.accentColor`: optional CSS color used for links and controls
- `theme.customCss`: additional local or external stylesheets loaded after docia's styles
- `theme.colorMode`: initial `system`, `light`, or `dark` appearance; readers can override it

## Markdown options

`docia` uses Bun's markdown parser and supports Bun parser options via `markdown`.

Useful defaults are already enabled, including headings IDs and common GFM features.

## Image options

Raster images in `publicDir` are optimized during production and development builds with Bun.Image.
URLs and file formats stay unchanged, and docia keeps the original whenever re-encoding would make a
file larger. SVG, GIF, AVIF, HEIC, and other files are copied without transformation.

- `images.optimize`: enable build-time optimization (default `true`)
- `images.jpegQuality`: JPEG quality from 1 to 100 (default `82`)
- `images.webpQuality`: WebP quality from 1 to 100 (default `82`)
- `images.pngCompressionLevel`: lossless PNG compression from 0 to 9 (default `9`)
- `images.maxPixels`: maximum decoded pixel count per image (default `64_000_000`)

Unknown configuration keys fail with a descriptive error so misspelled options cannot be silently
ignored.
