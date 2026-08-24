import { afterEach, describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import { buildSite } from "../src/build";
import { loadConfig } from "../src/config/load-config";
import { serveStaticRequest } from "../src/server/static";
import { createTestProjectFixture } from "./helpers/project-fixture";

const cleanupTasks: Array<() => Promise<void>> = [];

afterEach(async () => {
	while (cleanupTasks.length > 0) {
		const cleanup = cleanupTasks.pop();
		if (cleanup) {
			await cleanup();
		}
	}
});

describe("buildSite", () => {
	test("emits static pages, SEO artifacts, and search index", async () => {
		const fixture = await createTestProjectFixture();
		cleanupTasks.push(fixture.cleanup);

		await fixture.write(
			"docia.config.ts",
			`export default {
  site: {
    title: "Fixture Docs",
    description: "Fixture docs for tests",
    language: "en",
    url: "https://docs.example.com",
		ogImage: "/default-social.png",
  },
	theme: {
		logo: "/logo.svg",
		favicon: "/favicon.svg",
		accentColor: "#0d9488",
		customCss: ["/custom.css"],
		colorMode: "dark",
	},
};
`,
		);

		await fixture.write(
			"book/SUMMARY.md",
			`# Summary

- [Intro](README.md)
- [Guide](guide.md)
- [Hidden](hidden.md)
- [Draft](draft.md)
`,
		);
		await fixture.write(
			"book/README.md",
			`# Intro

Welcome to fixture docs.
`,
		);
		await fixture.write(
			"book/guide.md",
			`---
title: Manual
description: A page-specific description.
slug: /manual
ogImage: /manual.png
redirectFrom: /guide
---
# Guide

Link back to [Intro](README.md).
`,
		);
		await fixture.write(
			"book/hidden.md",
			`---
noindex: true
---
# Hidden

This page is available but excluded from discovery files.
`,
		);
		await fixture.write(
			"book/draft.md",
			`---
draft: true
---
# Draft
`,
		);
		await fixture.write("public/asset.txt", "asset-content");
		await fixture.write("public/custom.css", ":root { --custom-test: 1; }");
		await fixture.write("public/logo.svg", '<svg xmlns="http://www.w3.org/2000/svg"/>');
		await fixture.write("public/favicon.svg", '<svg xmlns="http://www.w3.org/2000/svg"/>');
		const compactPng = Uint8Array.fromBase64(
			"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
		);
		const paddedPng = new Uint8Array(compactPng.byteLength + 2048);
		paddedPng.set(compactPng);
		await fixture.write("public/images/padded.png", paddedPng);

		const loaded = await loadConfig({ cwd: fixture.rootDir });
		const result = await buildSite(loaded.config);

		expect(result.pageCount).toBe(3);
		expect(result.redirectCount).toBe(1);

		const indexPath = resolve(fixture.rootDir, "dist/index.html");
		const guidePath = resolve(fixture.rootDir, "dist/manual/index.html");
		const redirectPath = resolve(fixture.rootDir, "dist/guide/index.html");
		const hiddenPath = resolve(fixture.rootDir, "dist/hidden/index.html");
		const draftPath = resolve(fixture.rootDir, "dist/draft/index.html");
		const notFoundPath = resolve(fixture.rootDir, "dist/404.html");
		const robotsPath = resolve(fixture.rootDir, "dist/robots.txt");
		const sitemapPath = resolve(fixture.rootDir, "dist/sitemap.xml");
		const llmsPath = resolve(fixture.rootDir, "dist/llms.txt");
		const assetPath = resolve(fixture.rootDir, "dist/asset.txt");
		const optimizedImagePath = resolve(fixture.rootDir, "dist/images/padded.png");
		const indexMarkdownPath = resolve(fixture.rootDir, "dist/index.html.md");
		const guideMarkdownPath = resolve(fixture.rootDir, "dist/manual/index.html.md");

		expect(await Bun.file(indexPath).exists()).toBe(true);
		expect(await Bun.file(guidePath).exists()).toBe(true);
		expect(await Bun.file(redirectPath).exists()).toBe(true);
		expect(await Bun.file(hiddenPath).exists()).toBe(true);
		expect(await Bun.file(draftPath).exists()).toBe(false);
		expect(await Bun.file(notFoundPath).exists()).toBe(true);
		expect(await Bun.file(robotsPath).exists()).toBe(true);
		expect(await Bun.file(sitemapPath).exists()).toBe(true);
		expect(await Bun.file(llmsPath).exists()).toBe(true);
		expect(await Bun.file(assetPath).exists()).toBe(true);
		expect(await Bun.file(optimizedImagePath).exists()).toBe(true);
		expect(Bun.file(optimizedImagePath).size).toBeLessThan(paddedPng.byteLength);
		expect(result.imageOptimization.discoveredCount).toBe(1);
		expect(result.imageOptimization.optimizedCount).toBe(1);
		expect(result.imageOptimization.bytesSaved).toBeGreaterThan(0);
		expect(await Bun.file(indexMarkdownPath).exists()).toBe(true);
		expect(await Bun.file(guideMarkdownPath).exists()).toBe(true);

		const indexHtml = await Bun.file(indexPath).text();
		expect(indexHtml).toContain('<link rel="canonical"');
		expect(indexHtml).toContain('rel="alternate" type="text/markdown"');
		expect(indexHtml).toContain('rel="describedby" href="/llms.txt"');
		expect(indexHtml).toContain('data-default-theme="dark"');
		expect(indexHtml).toContain('style="--docia-accent:#0d9488"');
		expect(indexHtml).toContain('href="/custom.css"');
		expect(indexHtml).toContain('class="heading-anchor"');
		expect(indexHtml).toContain('id="gd-command-input"');
		const searchIndexHref = /<meta name="docia-search-index" content="([^"]+)"\s*\/?>/.exec(
			indexHtml,
		)?.[1];
		expect(searchIndexHref).toMatch(/^\/search-index-[a-z0-9]{13}\.json$/);
		expect(indexHtml).toContain(
			`<link rel="preload" href="${searchIndexHref}" as="fetch" crossorigin="anonymous"/>`,
		);
		const searchPath = resolve(fixture.rootDir, "dist", (searchIndexHref ?? "").slice(1));
		expect(await Bun.file(searchPath).exists()).toBe(true);
		const searchContents = await Bun.file(searchPath).text();
		const searchFingerprint = Bun.hash(searchContents).toString(36).padStart(13, "0");
		expect(searchIndexHref).toBe(`/search-index-${searchFingerprint}.json`);

		const stylesheetMatch = /<link\s+rel="stylesheet"\s+href="([^"]+\.css)"\s*\/?>/.exec(
			indexHtml,
		);
		const scriptMatch = /<script\s+type="module"\s+src="([^"]+\.js)"\s*><\/script>/.exec(
			indexHtml,
		);

		expect(stylesheetMatch?.[1]).toBeDefined();
		expect(scriptMatch?.[1]).toBeDefined();

		const stylesheetPath = resolve(
			fixture.rootDir,
			"dist",
			(stylesheetMatch?.[1] ?? "").replace(/^\//, ""),
		);
		const scriptPath = resolve(
			fixture.rootDir,
			"dist",
			(scriptMatch?.[1] ?? "").replace(/^\//, ""),
		);

		expect(await Bun.file(stylesheetPath).exists()).toBe(true);
		expect(await Bun.file(scriptPath).exists()).toBe(true);

		const guideHtml = await Bun.file(guidePath).text();
		expect(guideHtml).toContain("<title>Manual - Fixture Docs</title>");
		expect(guideHtml).toContain('content="A page-specific description."');
		expect(guideHtml).toContain('content="https://docs.example.com/manual.png"');
		const redirectHtml = await Bun.file(redirectPath).text();
		expect(redirectHtml).toContain('http-equiv="refresh"');
		expect(redirectHtml).toContain("url=/manual/");
		const hiddenHtml = await Bun.file(hiddenPath).text();
		expect(hiddenHtml).toContain('content="noindex,nofollow"');
		const guideMarkdown = await Bun.file(guideMarkdownPath).text();
		expect(guideMarkdown).toStartWith("# Guide");
		expect(guideMarkdown).not.toContain("redirectFrom");

		const llmsTxt = await Bun.file(llmsPath).text();
		expect(llmsTxt).toContain("# Fixture Docs");
		expect(llmsTxt).toContain("## Docs");
		expect(llmsTxt).toContain("https://docs.example.com/index.html.md");
		expect(llmsTxt).toContain("https://docs.example.com/manual/index.html.md");
		expect(llmsTxt).not.toContain("hidden/index.html.md");
		expect(llmsTxt).not.toContain("draft/index.html.md");
		expect(llmsTxt).toContain(`https://docs.example.com${searchIndexHref}`);

		const searchPayload = JSON.parse(searchContents) as {
			pages: Array<{ routePath: string }>;
		};
		expect(searchPayload.pages.length).toBe(3);
		expect(searchPayload.pages.map((page) => page.routePath)).toContain("/");
		expect(searchPayload.pages.map((page) => page.routePath)).toContain("/manual/");

		const searchResponse = await serveStaticRequest({
			config: loaded.config,
			request: new Request(`http://localhost${searchIndexHref}`),
			noCache: true,
		});
		expect(searchResponse.headers.get("cache-control")).toBe(
			"public, max-age=31536000, immutable",
		);

		const rebuilt = await buildSite(loaded.config);
		const rebuiltSearchIndex = rebuilt.outputFiles.find((outputFile) =>
			/^search-index-[a-z0-9]{13}\.json$/.test(outputFile),
		);
		expect(rebuiltSearchIndex).toBe(searchIndexHref?.slice(1));

		const developmentBuild = await buildSite(loaded.config, {
			includeDrafts: true,
			liveReload: true,
		});
		expect(developmentBuild.pageCount).toBe(4);
		expect(await Bun.file(draftPath).exists()).toBe(true);
		const draftHtml = await Bun.file(draftPath).text();
		expect(draftHtml).toContain('content="noindex,nofollow"');
		expect(draftHtml).toContain('name="docia-live-reload"');

		const missingResponse = await serveStaticRequest({
			config: loaded.config,
			request: new Request("http://localhost/missing/"),
			noCache: true,
		});
		expect(missingResponse.status).toBe(404);
		expect(await missingResponse.text()).toContain("Back to Fixture Docs");
	});
});
